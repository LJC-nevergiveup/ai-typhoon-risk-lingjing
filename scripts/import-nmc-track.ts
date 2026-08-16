/**
 * 中国气象局台风网（typhoon.nmc.cn）历史台风数据导入脚本
 * =========================================================
 * 将 public/data/raw/nmc/yagi-2024-view.json（官网 API 原始 JSONP，只读）
 * 解析为项目 REAL 数据格式，输出 public/data/real/yagi-2024/track.geojson。
 *
 * 背景：tcdata.typhoon.org.cn（CMA-STI 最佳路径 CH2024BST.txt）受 WAF
 * （SafeLine JS 挑战）保护，无法程序化下载；本数据为同一机构（中国气象局）
 * 台风网官方历史台风（最佳路径）数据，用于本项目轨迹。
 * CMA-BST 原始文件后续若可获得，将作为交叉核验来源。
 *
 * 用法：
 *   npm run import:yagi                          # 解析并生成 track.geojson（QA 通过才写盘）
 *   npm run import:yagi -- --self-test           # 内置合成样本自检（不涉及真实数据）
 *   npm run import:yagi -- --update-manifest     # QA 通过后同步把 manifest.json 置为 available
 *
 * 原始 JSON 每个轨迹点为数组：
 *   [id, "YYYYMMDDHHMM"(UTC), epoch(ms), 等级代码, 经度°, 纬度°, 气压 hPa, 风速 m/s,
 *    字段8(字符串"no"/"yes", 官方语义未经证实), ?, 风圈数组(可空), ?, 预报信息]
 * 等级代码：TD/TS/STS/TY/STY/SuperTY。
 * 铁律：异常即报告并中止，绝不静默修复；只有 QA 全部通过才写盘。
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const RAW_FILE = join(ROOT, 'public', 'data', 'raw', 'nmc', 'yagi-2024-view.json')
const OUTPUT_FILE = join(ROOT, 'public', 'data', 'real', 'yagi-2024', 'track.geojson')
const MANIFEST_FILE = join(ROOT, 'public', 'data', 'real', 'yagi-2024', 'manifest.json')

const TARGET_ID = 3275487 // NMC 台风网中 YAGI（2411）的台风 id
const SOURCE_LABEL = '中国气象局台风网（typhoon.nmc.cn）历史台风数据'
const RAW_FILE_NAME = 'yagi-2024-view.json'
const RAW_SOURCE_URL = 'http://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_3275487'

const NMC_GRADE_MAP: Record<string, string> = {
  TD: '热带低压',
  TS: '热带风暴',
  STS: '强热带风暴',
  TY: '台风',
  STY: '强台风',
  SuperTY: '超强台风',
}

/* ---------------- 数据结构 ---------------- */

interface ParsedPoint {
  nmcId: number
  timeRaw: string
  epochMs: number
  gradeCode: string
  lonRaw: number
  latRaw: number
  pressureRaw: number
  windRaw: number
  landfallFlag: string
  windRadiiRaw: unknown
  timestamp: string | null
  longitude: number | null
  latitude: number | null
  centralPressure: number | null
  maxWindSpeed: number | null
  intensity: string | null
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

/** YYYYMMDDHHMM（UTC）→ ISO 8601 UTC；解析失败返回 null */
function parseTimestamp(raw: string): string | null {
  if (!/^\d{12}$/.test(raw)) return null
  const y = Number(raw.slice(0, 4))
  const mo = Number(raw.slice(4, 6))
  const d = Number(raw.slice(6, 8))
  const h = Number(raw.slice(8, 10))
  const mi = Number(raw.slice(10, 12))
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23 || mi < 0 || mi > 59) return null
  const iso = `${y}-${pad2(mo)}-${pad2(d)}T${pad2(h)}:${pad2(mi)}:00Z`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  // 往返校验
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== mo ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== h ||
    date.getUTCMinutes() !== mi
  ) {
    return null
  }
  return iso
}

function parsePoint(raw: unknown[]): ParsedPoint {
  const nmcId = raw[0]
  const timeRaw = raw[1]
  const epochMs = raw[2]
  const gradeCode = raw[3]
  const lonRaw = raw[4]
  const latRaw = raw[5]
  const pressureRaw = raw[6]
  const windRaw = raw[7]
  /** 原始 API 响应字段 8（字符串 "no"/"yes"）：官方语义未经证实，不视为登陆标记 */
  const flagRaw = raw[8]
  const windRadiiRaw = raw[10]

  const num = (v: unknown): number | null => {
    const n = typeof v === 'string' ? Number(v) : v
    return typeof n === 'number' && Number.isFinite(n) ? n : null
  }

  const point: ParsedPoint = {
    nmcId: typeof nmcId === 'number' ? nmcId : -1,
    timeRaw: typeof timeRaw === 'string' ? timeRaw : '',
    epochMs: typeof epochMs === 'number' ? epochMs : -1,
    gradeCode: typeof gradeCode === 'string' ? gradeCode : '',
    lonRaw: num(lonRaw) ?? NaN,
    latRaw: num(latRaw) ?? NaN,
    pressureRaw: num(pressureRaw) ?? NaN,
    windRaw: num(windRaw) ?? NaN,
    landfallFlag: typeof flagRaw === 'string' ? flagRaw : String(flagRaw ?? ''),
    windRadiiRaw,
    timestamp: parseTimestamp(typeof timeRaw === 'string' ? timeRaw : ''),
    longitude: null,
    latitude: null,
    centralPressure: null,
    maxWindSpeed: null,
    intensity: null,
  }
  // 数值有效性（写入 null 表示缺失，由 QA 拦截）
  if (Number.isFinite(point.lonRaw) && point.lonRaw >= -180 && point.lonRaw <= 180) {
    point.longitude = point.lonRaw
  }
  if (Number.isFinite(point.latRaw) && point.latRaw >= -90 && point.latRaw <= 90) {
    point.latitude = point.latRaw
  }
  if (Number.isFinite(point.pressureRaw) && point.pressureRaw > 0) {
    point.centralPressure = point.pressureRaw
  }
  if (Number.isFinite(point.windRaw) && point.windRaw >= 0) {
    point.maxWindSpeed = point.windRaw
  }
  point.intensity = NMC_GRADE_MAP[point.gradeCode] ?? null
  return point
}

function parseJsonp(text: string): { typhoonId: number; points: ParsedPoint[] } | null {
  const m = text.match(/^typhoon_jsons_view_(\d+)\((.*)\)\s*$/s)
  if (!m) return null
  const typhoonId = Number(m[1])
  let data: { typhoon?: unknown[] }
  try {
    data = JSON.parse(m[2]) as { typhoon?: unknown[] }
  } catch {
    return null
  }
  const track = data.typhoon?.[8]
  if (!Array.isArray(track)) return null
  const points = track
    .filter((p): p is unknown[] => Array.isArray(p) && p.length >= 13)
    .map((p) => parsePoint(p))
  return { typhoonId, points }
}

/* ---------------- QA ---------------- */

function runQa(points: ParsedPoint[]): QaResult {
  const errors: string[] = []
  const warnings: string[] = []
  const lines: string[] = []
  const sorted = [...points].sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))

  const invalidCoords = sorted.filter((p) => p.latitude === null || p.longitude === null).length
  const badTimestamps = sorted.filter((p) => p.timestamp === null).length
  const missingPressure = sorted.filter((p) => p.centralPressure === null).length
  const missingWind = sorted.filter((p) => p.maxWindSpeed === null).length
  const unknownIntensity = sorted.filter((p) => p.intensity === null).length
  const timestamps = sorted.map((p) => p.timestamp as string)
  const duplicateCount = timestamps.length - new Set(timestamps).size

  // epoch 与时间字符串交叉校验
  const epochMismatch = sorted.filter((p) => {
    if (p.timestamp === null || p.epochMs < 0) return false
    const fromEpoch = new Date(p.epochMs).toISOString().slice(0, 16).replace(/[-T:]/g, '')
    return p.timeRaw.slice(0, 12) !== fromEpoch
  }).length

  if (sorted.length === 0) errors.push('未解析到任何轨迹点')
  if (duplicateCount > 0) errors.push(`存在 ${duplicateCount} 个重复时间戳`)
  if (invalidCoords > 0) errors.push(`存在 ${invalidCoords} 个非法坐标`)
  if (badTimestamps > 0) errors.push(`存在 ${badTimestamps} 个无法解析的时间`)
  if (missingPressure > 0) errors.push(`存在 ${missingPressure} 个缺失/非法中心气压`)
  if (missingWind > 0) errors.push(`存在 ${missingWind} 个缺失/非法风速`)
  if (unknownIntensity > 0) errors.push(`存在 ${unknownIntensity} 个未知强度标记`)
  if (epochMismatch > 0) warnings.push(`${epochMismatch} 个点的时间字符串与 epoch 毫秒不一致（以 epoch 为准）`)

  const times = sorted.map((p) => new Date(p.timestamp as string).getTime())
  const gapsHours: number[] = []
  for (let i = 1; i < times.length; i++) gapsHours.push((times[i] - times[i - 1]) / 3_600_000)
  const count3h = gapsHours.filter((g) => g === 3).length
  const sortedGaps = [...gapsHours].sort((a, b) => a - b)
  const median = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : null

  const lats = sorted.map((p) => p.latitude as number)
  const lons = sorted.map((p) => p.longitude as number)
  const pressures = sorted.map((p) => p.centralPressure as number)
  const winds = sorted.map((p) => p.maxWindSpeed as number)
  const grades = [...new Set(sorted.map((p) => p.gradeCode))].join(', ')
  const flagRawCount = sorted.filter((p) => p.landfallFlag !== 'no').length
  const min = (xs: number[]) => Math.min(...xs)
  const max = (xs: number[]) => Math.max(...xs)

  lines.push('Storm: YAGI（摩羯，2024 年第 11 号 / 2411）')
  lines.push(`NMC 台风 id: ${TARGET_ID}`)
  lines.push(`Track point count: ${sorted.length}`)
  lines.push(`Start: ${sorted[0]?.timestamp ?? '—'}`)
  lines.push(`End: ${sorted[sorted.length - 1]?.timestamp ?? '—'}`)
  lines.push(`Latitude range: ${sorted.length ? `${min(lats).toFixed(1)} — ${max(lats).toFixed(1)} °N` : '—'}`)
  lines.push(`Longitude range: ${sorted.length ? `${min(lons).toFixed(1)} — ${max(lons).toFixed(1)} °E` : '—'}`)
  lines.push(`Pressure range: ${sorted.length ? `${min(pressures)} — ${max(pressures)} hPa` : '—'}`)
  lines.push(`Wind speed range: ${sorted.length ? `${min(winds)} — ${max(winds)} m/s` : '—'}`)
  lines.push(`Grades: ${grades}`)
  lines.push(`Timestamp duplicate count: ${duplicateCount}`)
  lines.push(`Invalid coordinate count: ${invalidCoords}`)
  lines.push(`Missing pressure count: ${missingPressure}`)
  lines.push(`Missing wind count: ${missingWind}`)
  lines.push(`时间间隔: min=${gapsHours.length ? Math.min(...gapsHours) : '—'}h max=${gapsHours.length ? Math.max(...gapsHours) : '—'}h median=${median ?? '—'}h`)
  lines.push(`3 小时加密记录数: ${count3h}`)
  lines.push(`原始字段8（nmcFlagRaw）非"no"点数: ${flagRawCount}（该字段官方语义未经证实，不视为登陆标记）`)

  return { ok: errors.length === 0, errors, warnings, lines }
}

/* ---------------- 输出构建 ---------------- */

function buildTrackGeojson(points: ParsedPoint[]): Record<string, unknown> {
  const sorted = [...points].sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
  const features = sorted.map((p) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
    properties: {
      id: p.timeRaw,
      timestamp: p.timestamp,
      longitude: p.longitude,
      latitude: p.latitude,
      centralPressure: p.centralPressure,
      maxWindSpeed: p.maxWindSpeed,
      intensity: p.intensity,
      source: SOURCE_LABEL,
      grade: p.gradeCode,
      nmcPointId: p.nmcId,
      nmcTimeRaw: p.timeRaw,
      nmcEpochMs: p.epochMs,
      nmcFlagRaw: p.landfallFlag,
      nmcWindRadiiRaw: p.windRadiiRaw,
      provenance: {
        organization: 'China Meteorological Administration（中国气象局台风网）',
        dataset: SOURCE_LABEL,
        rawFile: RAW_FILE_NAME,
        url: RAW_SOURCE_URL,
        note: 'tcdata.typhoon.org.cn（CMA-STI 最佳路径文件）受 WAF 保护暂不可程序化下载；本数据为同一机构台风网官方历史分析数据。',
      },
    },
  }))
  return {
    type: 'FeatureCollection',
    status: 'available',
    schemaVersion: 1,
    generatedBy: 'scripts/import-nmc-track.ts',
    generatedAt: new Date().toISOString(),
    note: '由中国气象局台风网官方历史台风数据自动生成，未经人工修改；校验结果见导入脚本 QA 输出。',
    features,
  }
}

function updateManifestStatus(start: string, end: string): void {
  const m = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) as Record<string, unknown>
  m.status = 'available'
  m.startTime = start
  m.endTime = end
  writeFileSync(MANIFEST_FILE, JSON.stringify(m, null, 2) + '\n')
  console.log(`[import:yagi] manifest.json 已更新：status=available, startTime=${start}, endTime=${end}`)
}

/* ---------------- 主流程 ---------------- */

function runImport(
  rawPath: string,
  outputPath: string,
  manifestPath: string | null,
  updateManifest: boolean,
): boolean {
  if (!existsSync(rawPath)) {
    console.error(`[import:yagi] missing source file: ${rawPath}`)
    console.error('请先从 typhoon.nmc.cn 台风网 API 保存 YAGI 原始 JSON（见 public/data/raw/nmc/README.md）。')
    return false
  }
  const parsed = parseJsonp(readFileSync(rawPath, 'utf8'))
  if (!parsed) {
    console.error('[import:yagi] 原始文件不是预期的 JSONP 格式或结构不符')
    return false
  }
  if (parsed.typhoonId !== TARGET_ID) {
    console.error(`[import:yagi] 台风 id 不匹配：文件为 ${parsed.typhoonId}，目标为 ${TARGET_ID}（YAGI）`)
    return false
  }

  const qa = runQa(parsed.points)
  for (const line of qa.lines) console.log(line)
  for (const w of qa.warnings) console.warn(`[QA 警告] ${w}`)
  for (const e of qa.errors) console.error(`[QA 错误] ${e}`)

  if (!qa.ok) {
    console.error('[import:yagi] QA 未通过，已中止，未写入任何文件（不静默修复异常数据）。')
    return false
  }

  mkdirSync(join(outputPath, '..'), { recursive: true })
  const geojson = buildTrackGeojson(parsed.points)
  writeFileSync(outputPath, JSON.stringify(geojson, null, 2) + '\n')
  const count = (geojson.features as unknown[]).length
  console.log(`[import:yagi] 已写入 ${outputPath}（${count} 个轨迹点）`)

  if (updateManifest && manifestPath) {
    const sorted = parsed.points.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
    updateManifestStatus(sorted[0]?.timestamp as string, sorted[sorted.length - 1]?.timestamp as string)
    console.log('[import:yagi] 提示：manifest 已置为 available，请仍在前端验证加载与地图显示后再部署。')
  } else {
    console.log('[import:yagi] 提示：manifest.json 尚未修改。前端验证通过后可加 --update-manifest 重新运行。')
  }
  return true
}

/* ---------------- 自检（仅使用合成样本，不涉及任何真实数据） ---------------- */

const SELF_TEST_SAMPLE = `typhoon_jsons_view_3275487({"typhoon":[3275487,"YAGI","摩羯",2411,2411,null,"摩羯星座","stop",[[1,"202409010000",1725148800000,"TD",126.2,12.2,1004,13,"no",0,[],null,null],[2,"202409010600",1725170400000,"TS",125.3,13.0,1002,15,"no",0,[],null,null],[3,"202409010900",1725181200000,"TS",124.8,13.4,998,18,"no",0,[],null,null]]]})`

const SELF_TEST_SAMPLE_BAD = `typhoon_jsons_view_3275487({"typhoon":[3275487,"YAGI","摩羯",2411,2411,null,"摩羯星座","stop",[[1,"202409010000",1725148800000,"TD",999.0,12.2,1004,13,"no",0,[],null,null]]]})`

function runSelfTest(): void {
  let passed = 0
  let failed = 0
  const workDir = join(tmpdir(), `nmc-import-selftest-${Date.now()}`)
  mkdirSync(workDir, { recursive: true })

  try {
    const samplePath = join(workDir, 'view.json')
    const outPath = join(workDir, 'track.geojson')
    writeFileSync(samplePath, SELF_TEST_SAMPLE, 'utf8')
    const ok = runImport(samplePath, outPath, null, false)
    if (ok && existsSync(outPath)) {
      const written = JSON.parse(readFileSync(outPath, 'utf8')) as { features: unknown[] }
      if (written.features.length === 3) {
        console.log('[self-test] CASE A PASS：3 个点解析成功（含 3 小时加密与等级映射）')
        passed++
      } else {
        console.error(`[self-test] CASE A FAIL：输出 ${written.features.length} 个点，期望 3`)
        failed++
      }
    } else {
      console.error('[self-test] CASE A FAIL：导入未成功')
      failed++
    }

    const badPath = join(workDir, 'view-bad.json')
    const badOut = join(workDir, 'track-bad.geojson')
    writeFileSync(badPath, SELF_TEST_SAMPLE_BAD, 'utf8')
    const badOk = runImport(badPath, badOut, null, false)
    if (!badOk && !existsSync(badOut)) {
      console.log('[self-test] CASE B PASS：非法坐标被 QA 拦截，未写入文件')
      passed++
    } else {
      console.error('[self-test] CASE B FAIL：异常数据未被拦截')
      failed++
    }

    if (!runImport(join(workDir, 'not-exist.json'), join(workDir, 'x.geojson'), null, false)) {
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
  console.log('[import:yagi] 目标：摩羯（YAGI，2024 年第 11 号 / 2411，NMC 台风 id 3275487）')
  const ok = runImport(RAW_FILE, OUTPUT_FILE, MANIFEST_FILE, updateManifest)
  if (!ok) process.exit(1)
}
