/**
 * CMA 热带气旋最佳路径数据集导入脚本
 * =========================================
 * 将 public/data/raw/cma/CH2024BST.txt 解析为项目 REAL 数据格式，
 * 输出 public/data/real/yagi-2024/track.geojson。
 *
 * 用法：
 *   npm run import:cma                          # 解析并生成 track.geojson（QA 全部通过才写盘）
 *   npm run import:cma -- --self-test           # 用内置合成样本自检解析器（不读取/写入任何真实文件）
 *   npm run import:cma -- --update-manifest     # QA 通过后同步把 manifest.json 置为 available
 *
 * 铁律：
 * - 原始文件只读，禁止修改；
 * - 不依赖固定行号，不假设固定 6 小时间隔；
 * - 任何异常都报告并中止，绝不静默修复；
 * - 只有 QA 全部通过才写盘。
 *
 * CMA 文本格式说明（tcdata.typhoon.org.cn 数据集说明）：
 * - 每个台风块以 "66666" 开头的 header 行起始，随后为记录行；
 * - 记录行：时间(YYYYMMDDHH, UTC) 强度标记(I) 纬度 经度 中心气压(hPa) 近中心最大风速(m/s) ...；
 * - 纬度/经度为整数，单位 0.1°（三位/四位）或 0.01°（四位/五位），不同来源版本略有差异，
 *   本脚本按数值量级自动识别单位，并经 [-90,90] / [-180,180] 校验，异常即报错；
 * - 强度标记 I：0=热带低压以下, 1=热带低压, 2=热带风暴, 3=强热带风暴,
 *   4=台风, 5=强台风, 6=超强台风, 9=变性气旋。
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const RAW_FILE = join(ROOT, 'public', 'data', 'raw', 'cma', 'CH2024BST.txt')
const OUTPUT_FILE = join(ROOT, 'public', 'data', 'real', 'yagi-2024', 'track.geojson')
const MANIFEST_FILE = join(ROOT, 'public', 'data', 'real', 'yagi-2024', 'manifest.json')

/** 目标台风：2024 年第 11 号 YAGI（摩羯） */
const TARGET_YEAR = 2024
const TARGET_NUMBER = 11
const SOURCE_LABEL = 'CMA Tropical Cyclone Best Track Dataset'
const RAW_FILE_NAME = 'CH2024BST.txt'

const CMA_INTENSITY_MAP: Record<number, string> = {
  0: '热带低压以下',
  1: '热带低压',
  2: '热带风暴',
  3: '强热带风暴',
  4: '台风',
  5: '强台风',
  6: '超强台风',
  9: '变性气旋',
}

/* ---------------- 数据结构 ---------------- */

interface ParsedRecord {
  line: string
  timeRaw: string
  intensityCode: number
  latRaw: string
  lonRaw: string
  pressureRaw: string
  windRaw: string
  timestamp: string | null
  latitude: number | null
  longitude: number | null
  centralPressure: number | null
  maxWindSpeed: number | null
  intensity: string | null
}

interface StormBlock {
  header: string
  year: number | null
  number: number | null
  englishName: string | null
  records: ParsedRecord[]
}

interface QaResult {
  ok: boolean
  errors: string[]
  warnings: string[]
  lines: string[]
}

/* ---------------- 解析工具 ---------------- */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** YYYYMMDDHH（UTC）→ ISO 8601 UTC；解析失败返回 null */
function parseTimestamp(raw: string): string | null {
  if (!/^\d{10}$/.test(raw)) return null
  const y = Number(raw.slice(0, 4))
  const m = Number(raw.slice(4, 6))
  const d = Number(raw.slice(6, 8))
  const h = Number(raw.slice(8, 10))
  if (m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23) return null
  const iso = `${y}-${pad2(m)}-${pad2(d)}T${pad2(h)}:00:00Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  // 往返校验（如 2 月 30 日会被 Date 滚动，必须拦截）
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== h
  ) {
    return null
  }
  return iso
}

/**
 * 纬度：CMA 文件中以 0.1°（三位，如 165 → 16.5°N）或 0.01°（四位，如 1650 → 16.50°N）存储。
 * 按量级自动识别单位，超出 [-90, 90] 视为非法。
 */
function parseLatitude(raw: string): number | null {
  if (raw.trim() === '') return null
  const v = Number(raw)
  if (!Number.isFinite(v)) return null
  const deg = Math.abs(v) < 1000 ? v / 10 : v / 100
  if (deg < -90 || deg > 90) return null
  return deg
}

/**
 * 经度：0.1°（四位，如 1268 → 126.8°E）或 0.01°（五位，如 12680 → 126.80°E）。
 * 超出 [-180, 180] 视为非法。
 */
function parseLongitude(raw: string): number | null {
  if (raw.trim() === '') return null
  const v = Number(raw)
  if (!Number.isFinite(v)) return null
  const deg = Math.abs(v) < 1800 ? v / 10 : v / 100
  if (deg < -180 || deg > 180) return null
  return deg
}

/** 中心气压（>0）与风速（≥0）；空或非法返回 null（计为缺失） */
function parsePressure(raw: string): number | null {
  if (raw.trim() === '') return null
  const v = Number(raw)
  if (!Number.isFinite(v) || v <= 0) return null
  return v
}

function parseWind(raw: string): number | null {
  if (raw.trim() === '') return null
  const v = Number(raw)
  if (!Number.isFinite(v) || v < 0) return null
  return v
}

function parseHeader(line: string): Omit<StormBlock, 'records'> {
  const tokens = line.trim().split(/\s+/)
  let year: number | null = null
  let number: number | null = null
  for (const t of tokens) {
    if (year === null && /^(19|20)\d{2}$/.test(t)) year = Number(t)
    else if (year !== null && number === null && /^\d{1,2}$/.test(t)) number = Number(t)
  }
  // 兼容 "YYNN" 合并编号（如 2411）
  if (number === null && year !== null) {
    const combined = tokens.find(
      (t) => /^\d{4}$/.test(t) && Number(t.slice(0, 2)) === year % 100,
    )
    if (combined) number = Number(combined.slice(2))
  }
  const last = tokens[tokens.length - 1]
  const englishName = /^[A-Z]{2,}$/.test(last) ? last : null
  return { header: line, year, number, englishName }
}

function parseRecordLine(line: string): ParsedRecord {
  const [timeRaw = '', intensityRaw = '', latRaw = '', lonRaw = '', pressureRaw = '', windRaw = ''] =
    line.trim().split(/\s+/)
  const intensityCode = Number(intensityRaw)
  return {
    line,
    timeRaw,
    intensityCode: Number.isInteger(intensityCode) ? intensityCode : -1,
    latRaw,
    lonRaw,
    pressureRaw,
    windRaw,
    timestamp: parseTimestamp(timeRaw),
    latitude: parseLatitude(latRaw),
    longitude: parseLongitude(lonRaw),
    centralPressure: parsePressure(pressureRaw),
    maxWindSpeed: parseWind(windRaw),
    intensity: CMA_INTENSITY_MAP[intensityCode] ?? null,
  }
}

function splitBlocks(text: string): StormBlock[] {
  const blocks: StormBlock[] = []
  let current: StormBlock | null = null
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '') continue
    if (line.startsWith('66666')) {
      if (current) blocks.push(current)
      current = { ...parseHeader(line), records: [] }
    } else if (current && /^\d{10}\s/.test(line)) {
      current.records.push(parseRecordLine(line))
    }
  }
  if (current) blocks.push(current)
  return blocks
}

/* ---------------- QA ---------------- */

function runQa(block: StormBlock): QaResult {
  const errors: string[] = []
  const warnings: string[] = []
  const lines: string[] = []
  const records = [...block.records].sort((a, b) =>
    (a.timestamp ?? '').localeCompare(b.timestamp ?? ''),
  )

  const invalidCoords = records.filter((r) => r.latitude === null || r.longitude === null).length
  const badTimestamps = records.filter((r) => r.timestamp === null).length
  const missingPressure = records.filter((r) => r.centralPressure === null).length
  const missingWind = records.filter((r) => r.maxWindSpeed === null).length
  const unknownIntensity = records.filter((r) => r.intensity === null).length

  const timestamps = records.map((r) => r.timestamp as string)
  const duplicateCount =
    timestamps.length - new Set(timestamps).size

  if (records.length === 0) errors.push('未解析到任何轨迹记录')
  if (duplicateCount > 0) errors.push(`存在 ${duplicateCount} 个重复时间戳`)
  if (invalidCoords > 0) errors.push(`存在 ${invalidCoords} 个非法坐标`)
  if (badTimestamps > 0) errors.push(`存在 ${badTimestamps} 条无法解析的时间`)
  if (missingPressure > 0) errors.push(`存在 ${missingPressure} 条缺失/非法中心气压`)
  if (missingWind > 0) errors.push(`存在 ${missingWind} 条缺失/非法风速`)
  if (unknownIntensity > 0) errors.push(`存在 ${unknownIntensity} 条未知强度标记`)

  // 时间间隔统计（不假设固定 6 小时）
  const times = timestamps.map((t) => new Date(t).getTime())
  const gapsHours: number[] = []
  for (let i = 1; i < times.length; i++) {
    gapsHours.push((times[i] - times[i - 1]) / 3_600_000)
  }
  const count3h = gapsHours.filter((g) => g === 3).length
  const sortedGaps = [...gapsHours].sort((a, b) => a - b)
  const median = sortedGaps.length
    ? sortedGaps[Math.floor(sortedGaps.length / 2)]
    : null

  const lats = records.map((r) => r.latitude as number)
  const lons = records.map((r) => r.longitude as number)
  const pressures = records.map((r) => r.centralPressure as number)
  const winds = records.map((r) => r.maxWindSpeed as number)

  // 西北太平洋 / 南海合理性提示（警告，不阻断）
  const outOfBasin = records.filter(
    (r) => (r.longitude as number) < 95 || (r.longitude as number) > 160 || (r.latitude as number) < 5 || (r.latitude as number) > 45,
  ).length
  if (outOfBasin > 0) {
    warnings.push(`${outOfBasin} 个点位于西北太平洋/南海常见范围（95–160°E，5–45°N）之外，请人工核对`)
  }

  const min = (xs: number[]) => Math.min(...xs)
  const max = (xs: number[]) => Math.max(...xs)
  const fmt = (n: number) => n.toFixed(2)

  const name = block.englishName ?? '—'
  const id = block.year !== null && block.number !== null ? `${block.year} 年第 ${block.number} 号` : '未识别'

  lines.push(`Storm: YAGI（摩羯，目标案例）`)
  lines.push(`CMA ID: ${id}（header 英文名: ${name}）`)
  lines.push(`Header: ${block.header}`)
  lines.push(`Track point count: ${records.length}`)
  lines.push(`Start: ${records[0]?.timestamp ?? '—'}`)
  lines.push(`End: ${records[records.length - 1]?.timestamp ?? '—'}`)
  lines.push(`Latitude range: ${records.length ? `${fmt(min(lats))} — ${fmt(max(lats))} °N` : '—'}`)
  lines.push(`Longitude range: ${records.length ? `${fmt(min(lons))} — ${fmt(max(lons))} °E` : '—'}`)
  lines.push(`Pressure range: ${records.length ? `${min(pressures)} — ${max(pressures)} hPa` : '—'}`)
  lines.push(`Wind speed range: ${records.length ? `${min(winds)} — ${max(winds)} m/s` : '—'}`)
  lines.push(`Timestamp duplicate count: ${duplicateCount}`)
  lines.push(`Invalid coordinate count: ${invalidCoords}`)
  lines.push(`Missing pressure count: ${missingPressure}`)
  lines.push(`Missing wind count: ${missingWind}`)
  lines.push(`时间间隔: min=${gapsHours.length ? Math.min(...gapsHours) : '—'}h max=${gapsHours.length ? Math.max(...gapsHours) : '—'}h median=${median ?? '—'}h`)
  lines.push(`3 小时加密记录数: ${count3h}`)

  return { ok: errors.length === 0, errors, warnings, lines }
}

/* ---------------- 输出构建 ---------------- */

function buildTrackGeojson(block: StormBlock): Record<string, unknown> {
  const records = [...block.records].sort((a, b) =>
    (a.timestamp ?? '').localeCompare(b.timestamp ?? ''),
  )
  const features = records.map((r) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
    properties: {
      id: r.timeRaw,
      timestamp: r.timestamp,
      longitude: r.longitude,
      latitude: r.latitude,
      centralPressure: r.centralPressure,
      maxWindSpeed: r.maxWindSpeed,
      intensity: r.intensity,
      source: SOURCE_LABEL,
      grade: String(r.intensityCode),
      cmaGrade: r.intensityCode,
      cmaLatitudeRaw: r.latRaw,
      cmaLongitudeRaw: r.lonRaw,
      cmaPressureRaw: r.pressureRaw,
      cmaWindRaw: r.windRaw,
      cmaRecord: r.line,
      provenance: {
        organization: 'China Meteorological Administration',
        dataset: SOURCE_LABEL,
        rawFile: RAW_FILE_NAME,
      },
    },
  }))
  return {
    type: 'FeatureCollection',
    status: 'available',
    schemaVersion: 1,
    generatedBy: 'scripts/import-cma-best-track.ts',
    generatedAt: new Date().toISOString(),
    note: '由 CMA 最佳路径数据集原始文件自动生成，未经人工修改；校验结果见导入脚本 QA 输出。',
    features,
  }
}

function readManifestName(): { chinese: string; english: string } {
  try {
    const m = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) as {
      chineseName?: string
      englishName?: string
    }
    return { chinese: m.chineseName ?? '', english: m.englishName ?? '' }
  } catch {
    return { chinese: '', english: '' }
  }
}

function updateManifestStatus(start: string, end: string): void {
  const m = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) as Record<string, unknown>
  m.status = 'available'
  m.startTime = start
  m.endTime = end
  writeFileSync(MANIFEST_FILE, JSON.stringify(m, null, 2) + '\n')
  console.log(`[import:cma] manifest.json 已更新：status=available, startTime=${start}, endTime=${end}`)
}

/* ---------------- 主流程 ---------------- */

function runImport(
  rawPath: string,
  outputPath: string,
  manifestPath: string | null,
  updateManifest: boolean,
): boolean {
  if (!existsSync(rawPath)) {
    console.error(`[import:cma] missing source file: ${rawPath}`)
    console.error(
      '请从中国气象局上海台风研究所 tcdata.typhoon.org.cn 下载“CMA 热带气旋最佳路径数据集”2024 年文件 CH2024BST.txt，',
    )
    console.error('放入 public/data/raw/cma/ 后重新运行。原始文件必须保持只读，禁止修改。')
    return false
  }

  const text = readFileSync(rawPath, 'utf8')
  const blocks = splitBlocks(text)
  if (blocks.length === 0) {
    console.error('[import:cma] 未在文件中解析到任何台风块（未找到 66666 header 行）')
    return false
  }

  const target = blocks.find((b) => b.year === TARGET_YEAR && b.number === TARGET_NUMBER)
  if (!target) {
    console.error(`[import:cma] 未找到 ${TARGET_YEAR} 年第 ${TARGET_NUMBER} 号台风（YAGI）。文件中识别到的台风：`)
    for (const b of blocks) {
      console.error(`  - ${b.year ?? '?'} 年第 ${b.number ?? '?'} 号（英文名: ${b.englishName ?? '—'}，记录 ${b.records.length} 条）`)
    }
    return false
  }

  const qa = runQa(target)
  for (const line of qa.lines) console.log(line)
  for (const w of qa.warnings) console.warn(`[QA 警告] ${w}`)
  for (const e of qa.errors) console.error(`[QA 错误] ${e}`)

  if (!qa.ok) {
    console.error('[import:cma] QA 未通过，已中止，未写入任何文件（不静默修复异常数据）。')
    return false
  }

  mkdirSync(join(outputPath, '..'), { recursive: true })
  const geojson = buildTrackGeojson(target)
  writeFileSync(outputPath, JSON.stringify(geojson, null, 2) + '\n')
  const count = (geojson.features as unknown[]).length
  console.log(`[import:cma] 已写入 ${outputPath}（${count} 个轨迹点）`)

  if (updateManifest && manifestPath) {
    const records = target.records
    updateManifestStatus(
      records[0]?.timestamp as string,
      records[records.length - 1]?.timestamp as string,
    )
    console.log(
      '[import:cma] 提示：manifest 已置为 available。请仍在前端验证加载与地图显示（REAL 模式），确认无误后再部署。',
    )
  } else {
    console.log(
      '[import:cma] 提示：manifest.json 尚未修改。前端验证通过后，可加 --update-manifest 重新运行以启用 REAL 案例。',
    )
  }
  return true
}

/* ---------------- 自检（仅使用合成样本，不涉及任何真实数据） ---------------- */

/** 自检样本：模拟 CMA 文本格式的合成内容，仅用于验证解析器逻辑 */
const SELF_TEST_SAMPLE = `
66666 00 M TS IMMA 2024090112 2024090812 0 2024 11 7000 0 0 2024 9 1 12 2024 9 8 12 0 0 0
2024090112 2 165 1268 996 18
2024090115 2 166 1265 994 20
2024090118 3 167 1262 990 23
2024090200 3 169 1258 985 25
2024090206 4 1725 12525 975 30
66666 00 M TS IMMA 2024081000 2024081506 0 2024 10 5000 0 0 2024 8 10 0 2024 8 15 6 0 0 0
2024081000 1 150 1300 1000 15
2024081006 1 152 1295 998 17
`

/** 自检样本（含异常）：目标台风存在重复时间戳，应被 QA 拦截 */
const SELF_TEST_SAMPLE_BAD = `
66666 00 M TS IMMA 2024090112 2024090812 0 2024 11 7000 0 0 2024 9 1 12 2024 9 8 12 0 0 0
2024090112 2 165 1268 996 18
2024090112 2 166 1265 994 20
`

function runSelfTest(): void {
  let passed = 0
  let failed = 0
  const workDir = join(tmpdir(), `cma-import-selftest-${Date.now()}`)
  mkdirSync(workDir, { recursive: true })

  const samplePath = join(workDir, 'CH2024BST.sample.txt')
  const outPath = join(workDir, 'track.geojson')

  try {
    writeFileSync(samplePath, SELF_TEST_SAMPLE, 'utf8')
    const ok = runImport(samplePath, outPath, null, false)
    if (ok && existsSync(outPath)) {
      const written = JSON.parse(readFileSync(outPath, 'utf8')) as { features: unknown[] }
      const expectCount = 5
      if (written.features.length === expectCount) {
        console.log(`[self-test] CASE A PASS：目标台风识别成功，输出 ${written.features.length} 个点（期望 ${expectCount}，含 3 小时加密记录与 0.01° 经纬度编码样本）`)
        passed++
      } else {
        console.error(`[self-test] CASE A FAIL：输出点数 ${written.features.length}，期望 ${expectCount}`)
        failed++
      }
    } else {
      console.error('[self-test] CASE A FAIL：导入未成功或未生成输出文件')
      failed++
    }

    const badPath = join(workDir, 'CH2024BST.bad.txt')
    const badOut = join(workDir, 'track-bad.geojson')
    writeFileSync(badPath, SELF_TEST_SAMPLE_BAD, 'utf8')
    const badOk = runImport(badPath, badOut, null, false)
    if (!badOk && !existsSync(badOut)) {
      console.log('[self-test] CASE B PASS：重复时间戳被 QA 拦截，未写入文件')
      passed++
    } else {
      console.error('[self-test] CASE B FAIL：异常数据未被拦截')
      failed++
    }

    const missingOk = runImport(join(workDir, 'not-exist.txt'), join(workDir, 'x.geojson'), null, false)
    if (!missingOk) {
      console.log('[self-test] CASE C PASS：缺失源文件时明确报错并停止')
      passed++
    } else {
      console.error('[self-test] CASE C FAIL：缺失源文件未被拦截')
      failed++
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }

  console.log(`[self-test] 结果：${passed} 通过 / ${failed} 失败`)
  if (failed > 0) process.exit(1)
}

/* ---------------- 入口 ---------------- */

const args = process.argv.slice(2)
if (args.includes('--self-test')) {
  runSelfTest()
} else {
  const updateManifest = args.includes('--update-manifest')
  console.log(`[import:cma] 目标：${readManifestName().chinese}（${readManifestName().english}，${TARGET_YEAR} 年第 ${TARGET_NUMBER} 号）`)
  const ok = runImport(RAW_FILE, OUTPUT_FILE, MANIFEST_FILE, updateManifest)
  if (!ok) process.exit(1)
}
