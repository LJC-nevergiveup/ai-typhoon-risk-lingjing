/**
 * 国家卫星气象中心环境观测资料整理脚本
 * =========================================
 * 读取 public/data/raw/nsmc/frames.json（人工登记的真实产品索引）与
 * raw/nsmc/satellite|sst/ 下的官方图像文件，校验后：
 *   1. 复制图像到 real/yagi-2024/environment/{satellite,sst}/imagery/
 *   2. 生成 environment/{satellite,sst}/manifest.json（status=available，含 processing 溯源）
 *
 * 用法：
 *   npm run import:environment                    # 校验并生成 manifest（QA 通过才写盘）
 *   npm run import:environment -- --self-test     # 内置合成样本自检（不涉及真实数据）
 *
 * 铁律：
 * - 原始文件只读；脚本只做“复制 + 改名”，不修改像素；
 * - processing 以 frames.json 中人工登记的记录为准，脚本仅补充“organized by importer”；
 * - 任何校验失败即中止，不写盘；
 * - 未提供官方文件时不得运行（manifest 保持 awaiting-authoritative-data）。
 *
 * frames.json 结构：
 * {
 *   "satellite": [{
 *     "id": "fy4b-agri-20240903-0000",
 *     "timestamp": "2024-09-03T00:00:00Z",        // ISO 8601 UTC
 *     "satellite": "FY-4B",
 *     "instrument": "AGRI",
 *     "product": "可见光真彩色图像",
 *     "sourceFile": "satellite/fy4b_agri_202409030000.png",  // 相对 raw/nsmc/
 *     "bbox": [105, 5, 140, 30],                   // [west, south, east, north]
 *     "source": "国家卫星气象中心 风云卫星遥感数据服务网",
 *     "sourceUrl": "https://satellite.nsmc.org.cn/",
 *     "caption": "YAGI 发展阶段的云系",
 *     "processing": ["downloaded official image product", "cropped for web visualization", "no meteorological values modified"]
 *   }],
 *   "sst": [{
 *     "id": "fy4b-agri-sst-20240903",
 *     "date": "2024-09-03",                        // YYYY-MM-DD（UTC 日尺度）
 *     "satellite": "FY-4B",
 *     "instrument": "AGRI",
 *     "product": "海表温度（SST）",
 *     "sourceFile": "sst/fy4b_agri_sst_20240903.png",
 *     "bbox": [105, 5, 140, 30],
 *     "unit": "°C",
 *     "valueRange": [24, 32],                      // 可选
 *     "source": "国家卫星气象中心 风云卫星遥感数据服务网",
 *     "sourceUrl": "https://data.nsmc.org.cn/",
 *     "legend": "官方色带：蓝→黄→红（24–32°C）",
 *     "processing": ["downloaded official image product", "reprojected to EPSG:4326", "color-mapped (official palette)", "exported to WebP"]
 *   }]
 * }
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const RAW_DIR = join(ROOT, 'public', 'data', 'raw', 'nsmc')
const FRAMES_FILE = join(RAW_DIR, 'frames.json')
const ENV_BASE = join(ROOT, 'public', 'data', 'real', 'yagi-2024', 'environment')

const SOURCE_TYPE_SATELLITE = 'satellite'
const SOURCE_TYPE_SST = 'ocean-observation'

/* ---------------- 类型 ---------------- */

interface SatelliteInput {
  id: string
  timestamp: string
  satellite: string
  instrument: string
  product: string
  sourceFile: string
  bbox: [number, number, number, number]
  source: string
  sourceUrl: string
  caption: string
  processing: string[]
}

interface SstInput {
  id: string
  date: string
  satellite: string
  instrument: string
  product: string
  sourceFile: string
  bbox: [number, number, number, number]
  unit: string
  valueRange?: [number, number]
  source: string
  sourceUrl: string
  legend: string
  processing: string[]
}

interface FramesIndex {
  satellite: SatelliteInput[]
  sst: SstInput[]
}

interface SatelliteFrameOut {
  id: string
  timestamp: string
  satellite: string
  instrument: string
  product: string
  imagePath: string
  bbox: [number, number, number, number] | null
  source: string
  sourceUrl: string
  sourceType: string
  processing: string[]
  caption: string
}

interface SstFrameOut {
  id: string
  date: string
  satellite: string
  instrument: string
  product: string
  imagePath: string
  bbox: [number, number, number, number] | null
  unit: string
  valueRange?: [number, number]
  source: string
  sourceUrl: string
  sourceType: string
  processing: string[]
  legend: string
}

interface Errors {
  errors: string[]
}

function fail(errors: Errors, message: string): void {
  errors.errors.push(message)
}

function requireString(value: unknown, label: string, errors: Errors): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(errors, `字段 ${label} 缺失或不是非空字符串`)
    return ''
  }
  return value.trim()
}

function requireNumber(value: unknown, label: string, errors: Errors): number {
  const n = typeof value === 'string' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    fail(errors, `字段 ${label} 不是有效数值`)
    return NaN
  }
  return n
}

function validateBbox(value: unknown, label: string, errors: Errors): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 4) {
    fail(errors, `字段 ${label} 必须为 [west, south, east, north] 四元数组`)
    return null
  }
  const nums = value.map((v, i) => requireNumber(v, `${label}[${i}]`, errors)) as [
    number,
    number,
    number,
    number,
  ]
  const [west, south, east, north] = nums
  if (Number.isFinite(west) && Number.isFinite(east) && Number.isFinite(south) && Number.isFinite(north)) {
    if (west >= east) fail(errors, `${label}：west 必须小于 east`)
    if (south >= north) fail(errors, `${label}：south 必须小于 north`)
    if (west < -180 || east > 180 || south < -90 || north > 90) {
      fail(errors, `${label}：超出经纬度合法范围`)
    }
  }
  return nums
}

function parseTimestampIso(raw: string, errors: Errors): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(raw)) {
    fail(errors, `timestamp 不是 ISO 8601 UTC 格式：${raw}`)
    return null
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 19) !== raw.slice(0, 19)) {
    fail(errors, `timestamp 无法解析或非法：${raw}`)
    return null
  }
  return raw
}

/* ---------------- 主流程 ---------------- */

function runImport(rawDir: string, framesPath: string, envBase: string): boolean {
  const errors: Errors = { errors: [] }

  if (!existsSync(framesPath)) {
    console.error(`[import:environment] missing source file: ${framesPath}`)
    console.error('请先人工下载官方产品并登记 frames.json（见 public/data/raw/nsmc/README.md）。')
    return false
  }

  let index: FramesIndex
  try {
    index = JSON.parse(readFileSync(framesPath, 'utf8')) as FramesIndex
  } catch (error) {
    console.error(`[import:environment] frames.json 解析失败：${error instanceof Error ? error.message : error}`)
    return false
  }

  if (!Array.isArray(index.satellite) || !Array.isArray(index.sst)) {
    console.error('[import:environment] frames.json 缺少 satellite / sst 数组')
    return false
  }
  if (index.satellite.length === 0 && index.sst.length === 0) {
    console.error('[import:environment] frames.json 中没有任何帧记录')
    return false
  }

  /* ---- 卫星帧 ---- */
  const satFrames: SatelliteFrameOut[] = []
  for (const f of index.satellite) {
    const id = requireString(f.id, 'satellite.id', errors)
    const timestamp = parseTimestampIso(requireString(f.timestamp, 'satellite.timestamp', errors), errors)
    const sourceFile = requireString(f.sourceFile, 'satellite.sourceFile', errors)
    const bbox = validateBbox(f.bbox, 'satellite.bbox', errors)
    const sourcePath = sourceFile ? join(rawDir, sourceFile) : ''
    if (sourcePath && !existsSync(sourcePath)) {
      fail(errors, `卫星图像文件不存在：${sourcePath}`)
    }
    const processing = Array.isArray(f.processing) && f.processing.length > 0
      ? f.processing.map((p) => String(p))
      : []
    if (processing.length === 0) {
      fail(errors, `satellite.${id} 缺少 processing（处理步骤必须记录）`)
    }
    satFrames.push({
      id,
      timestamp: timestamp ?? '',
      satellite: requireString(f.satellite, 'satellite.satellite', errors),
      instrument: requireString(f.instrument, 'satellite.instrument', errors),
      product: requireString(f.product, 'satellite.product', errors),
      imagePath: '', // 复制后填充
      bbox,
      source: requireString(f.source, 'satellite.source', errors),
      sourceUrl: requireString(f.sourceUrl, 'satellite.sourceUrl', errors),
      sourceType: SOURCE_TYPE_SATELLITE,
      processing,
      caption: requireString(f.caption, 'satellite.caption', errors),
    })
  }

  /* ---- SST 帧 ---- */
  const sstFrames: SstFrameOut[] = []
  for (const f of index.sst) {
    const id = requireString(f.id, 'sst.id', errors)
    const date = requireString(f.date, 'sst.date', errors)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fail(errors, `sst.date 不是 YYYY-MM-DD：${date}`)
    }
    const unit = requireString(f.unit, 'sst.unit', errors)
    if (unit !== '°C') {
      fail(errors, `sst.unit 必须为 °C，实际：${unit}`)
    }
    const sourceFile = requireString(f.sourceFile, 'sst.sourceFile', errors)
    const bbox = validateBbox(f.bbox, 'sst.bbox', errors)
    const sourcePath = sourceFile ? join(rawDir, sourceFile) : ''
    if (sourcePath && !existsSync(sourcePath)) {
      fail(errors, `SST 图像文件不存在：${sourcePath}`)
    }
    let valueRange: [number, number] | undefined
    if (f.valueRange != null) {
      if (!Array.isArray(f.valueRange) || f.valueRange.length !== 2) {
        fail(errors, `sst.${id}.valueRange 必须为 [min, max]`)
      } else {
        const lo = requireNumber(f.valueRange[0], 'sst.valueRange[0]', errors)
        const hi = requireNumber(f.valueRange[1], 'sst.valueRange[1]', errors)
        if (Number.isFinite(lo) && Number.isFinite(hi) && lo < hi) valueRange = [lo, hi]
        else if (Number.isFinite(lo) && Number.isFinite(hi)) fail(errors, `sst.${id}.valueRange 必须 lo < hi`)
      }
    }
    const processing = Array.isArray(f.processing) && f.processing.length > 0
      ? f.processing.map((p) => String(p))
      : []
    if (processing.length === 0) {
      fail(errors, `sst.${id} 缺少 processing（处理步骤必须记录）`)
    }
    sstFrames.push({
      id,
      date,
      satellite: requireString(f.satellite, 'sst.satellite', errors),
      instrument: requireString(f.instrument, 'sst.instrument', errors),
      product: requireString(f.product, 'sst.product', errors),
      imagePath: '',
      bbox,
      unit,
      valueRange,
      source: requireString(f.source, 'sst.source', errors),
      sourceUrl: requireString(f.sourceUrl, 'sst.sourceUrl', errors),
      sourceType: SOURCE_TYPE_SST,
      processing,
      legend: requireString(f.legend, 'sst.legend', errors),
    })
  }

  if (errors.errors.length > 0) {
    for (const e of errors.errors) console.error(`[QA 错误] ${e}`)
    console.error('[import:environment] QA 未通过，已中止，未写入任何文件。')
    return false
  }

  /* ---- 复制文件并生成 manifest ---- */
  const satImageryDir = join(envBase, 'satellite', 'imagery')
  const sstImageryDir = join(envBase, 'sst', 'imagery')
  mkdirSync(satImageryDir, { recursive: true })
  mkdirSync(sstImageryDir, { recursive: true })

  for (const [i, frame] of satFrames.entries()) {
    const src = index.satellite[i]
    const ext = extname(src.sourceFile) || '.png'
    const targetName = `${frame.id}${ext}`
    copyFileSync(join(rawDir, src.sourceFile), join(satImageryDir, targetName))
    frame.imagePath = `real/yagi-2024/environment/satellite/imagery/${targetName}`
    if (!frame.processing.some((p) => p.includes('organized by'))) {
      frame.processing.push('organized by scripts/import-nsmc-environment.ts (copy only, no pixel modification)')
    }
  }
  for (const [i, frame] of sstFrames.entries()) {
    const src = index.sst[i]
    const ext = extname(src.sourceFile) || '.png'
    const targetName = `${frame.id}${ext}`
    copyFileSync(join(rawDir, src.sourceFile), join(sstImageryDir, targetName))
    frame.imagePath = `real/yagi-2024/environment/sst/imagery/${targetName}`
    if (!frame.processing.some((p) => p.includes('organized by'))) {
      frame.processing.push('organized by scripts/import-nsmc-environment.ts (copy only, no pixel modification)')
    }
  }

  const satManifest = {
    schemaVersion: 1,
    status: 'available',
    note: '由 scripts/import-nsmc-environment.ts 生成；图像为官方产品的网页展示副本，处理步骤见各帧 processing（不得视为原始卫星数据）。',
    frames: satFrames,
  }
  const sstManifest = {
    schemaVersion: 1,
    status: 'available',
    note: '由 scripts/import-nsmc-environment.ts 生成；图像为官方产品的网页展示副本，处理步骤见各帧 processing（不得视为原始卫星数据）。',
    frames: sstFrames,
  }
  writeFileSync(join(envBase, 'satellite', 'manifest.json'), JSON.stringify(satManifest, null, 2) + '\n')
  writeFileSync(join(envBase, 'sst', 'manifest.json'), JSON.stringify(sstManifest, null, 2) + '\n')

  console.log('===== 环境资料导入 QA =====')
  console.log(`卫星帧数: ${satFrames.length}`)
  for (const [i, f] of satFrames.entries()) {
    const src = index.satellite[i]
    const ext = extname(src.sourceFile) || '.png'
    const size = statSync(join(envBase, 'satellite', 'imagery', `${f.id}${ext}`)).size
    console.log(`  - ${f.id} | ${f.timestamp} | ${f.satellite} ${f.instrument} | ${f.product} | ${size} bytes`)
  }
  console.log(`SST 帧数: ${sstFrames.length}`)
  for (const f of sstFrames) {
    console.log(`  - ${f.id} | ${f.date} | ${f.satellite} ${f.instrument} | ${f.unit}${f.valueRange ? ` ${f.valueRange[0]}–${f.valueRange[1]}` : ''} | ${f.legend}`)
  }
  console.log('[import:environment] 已写入两个 manifest（status=available）')
  console.log('[import:environment] 提示：前端将显示帧时间与轨迹时次的时间差，请核对 processing 是否与人工处理一致。')
  return true
}

/* ---------------- 自检（合成样本，不涉及任何真实数据） ---------------- */

const SELF_TEST_FRAMES = {
  satellite: [
    {
      id: 'test-sat-1',
      timestamp: '2024-09-03T00:00:00Z',
      satellite: 'FY-4B',
      instrument: 'AGRI',
      product: '可见光真彩色图像（合成自检）',
      sourceFile: 'satellite/test-sat-1.png',
      bbox: [105, 5, 140, 30],
      source: '自检合成来源',
      sourceUrl: 'https://example.com/self-test',
      caption: '自检帧',
      processing: ['synthetic self-test fixture', 'no meteorological values modified'],
    },
  ],
  sst: [
    {
      id: 'test-sst-1',
      date: '2024-09-03',
      satellite: 'FY-4B',
      instrument: 'AGRI',
      product: '海表温度（SST，合成自检）',
      sourceFile: 'sst/test-sst-1.png',
      bbox: [105, 5, 140, 30],
      unit: '°C',
      valueRange: [24, 32],
      source: '自检合成来源',
      sourceUrl: 'https://example.com/self-test',
      legend: '蓝→黄→红',
      processing: ['synthetic self-test fixture', 'no meteorological values modified'],
    },
  ],
}

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

function runSelfTest(): void {
  let passed = 0
  let failed = 0
  const workDir = join(tmpdir(), `nsmc-import-selftest-${Date.now()}`)
  const rawDir = join(workDir, 'raw')
  const envBase = join(workDir, 'environment')
  mkdirSync(join(rawDir, 'satellite'), { recursive: true })
  mkdirSync(join(rawDir, 'sst'), { recursive: true })
  mkdirSync(envBase, { recursive: true })

  try {
    writeFileSync(join(rawDir, 'satellite', 'test-sat-1.png'), PNG_1PX)
    writeFileSync(join(rawDir, 'sst', 'test-sst-1.png'), PNG_1PX)
    writeFileSync(join(rawDir, 'frames.json'), JSON.stringify(SELF_TEST_FRAMES, null, 2))

    const ok = runImport(rawDir, join(rawDir, 'frames.json'), envBase)
    if (ok && existsSync(join(envBase, 'satellite', 'manifest.json')) && existsSync(join(envBase, 'sst', 'manifest.json'))) {
      const sat = JSON.parse(readFileSync(join(envBase, 'satellite', 'manifest.json'), 'utf8'))
      const sst = JSON.parse(readFileSync(join(envBase, 'sst', 'manifest.json'), 'utf8'))
      if (sat.status === 'available' && sat.frames.length === 1 && sst.frames.length === 1 && sst.frames[0].unit === '°C') {
        console.log('[self-test] CASE A PASS：卫星与 SST 帧校验、复制与 manifest 生成成功')
        passed++
      } else {
        console.error('[self-test] CASE A FAIL：manifest 内容不符')
        failed++
      }
    } else {
      console.error('[self-test] CASE A FAIL：导入未成功')
      failed++
    }

    const badFrames = JSON.parse(JSON.stringify(SELF_TEST_FRAMES))
    badFrames.sst[0].unit = 'K'
    writeFileSync(join(rawDir, 'frames.json'), JSON.stringify(badFrames, null, 2))
    const badOk = runImport(rawDir, join(rawDir, 'frames.json'), join(workDir, 'env-bad'))
    if (!badOk) {
      console.log('[self-test] CASE B PASS：单位非法（K）被 QA 拦截')
      passed++
    } else {
      console.error('[self-test] CASE B FAIL：非法单位未被拦截')
      failed++
    }

    if (!runImport(join(workDir, 'no-such-dir'), join(workDir, 'x.json'), join(workDir, 'y'))) {
      console.log('[self-test] CASE C PASS：缺失索引文件时明确报错并停止')
      passed++
    } else {
      console.error('[self-test] CASE C FAIL：缺失索引未被拦截')
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
  const ok = runImport(RAW_DIR, FRAMES_FILE, ENV_BASE)
  if (!ok) process.exit(1)
}
