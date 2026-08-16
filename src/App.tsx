import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ActiveMapData,
  ChapterId,
  LayerId,
  LoadState,
  RiskQuery,
  SourceInfo,
} from './types'
import { getChapter, CHAPTER_ORDER } from './data/chapters'
import { getTyphoonCase, TYPHOON_CASES } from './data/cases'
import { loadCase } from './data/loaders'
import type { CaseLoadResult } from './data/loaders'
import { LANDFALL_HIGHLIGHT_WINDOW_HOURS } from './services/mapConfig'
import Header from './components/Header/Header'
import ChapterNavigation from './components/ChapterNavigation/ChapterNavigation'
import TyphoonMap from './components/TyphoonMap/TyphoonMap'
import InfoPanel from './components/InfoPanel/InfoPanel'
import Timeline from './components/Timeline/Timeline'
import LayerControl from './components/LayerControl/LayerControl'
import EnvironmentStatus from './components/EnvironmentStatus/EnvironmentStatus'
import styles from './App.module.css'

export default function App() {
  const [activeCaseId, setActiveCaseId] = useState<string>(TYPHOON_CASES[0].id)
  const [data, setData] = useState<ActiveMapData | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [notice, setNotice] = useState<string | null>(null)
  const [sources, setSources] = useState<SourceInfo[]>([])
  const [activeChapterId, setActiveChapterId] = useState<ChapterId>('origin')
  const [activeLayers, setActiveLayers] = useState<LayerId[]>(['track', 'windRadii'])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [satelliteOpacity, setSatelliteOpacity] = useState(0.7)
  const [riskQuery, setRiskQuery] = useState<RiskQuery | null>(null)
  const [aoiSignal, setAoiSignal] = useState(0)
  const [visited, setVisited] = useState<ChapterId[]>([])
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      return localStorage.getItem('typhoon-intro-seen') !== '1'
    } catch {
      return true
    }
  })

  /** 案例加载结果缓存：切换回已加载案例时不重复请求 */
  const caseCacheRef = useRef<Map<string, CaseLoadResult>>(new Map())

  const activeCase = useMemo(() => getTyphoonCase(activeCaseId), [activeCaseId])
  const chapter = useMemo(() => getChapter(activeChapterId), [activeChapterId])

  const applyResult = useCallback((result: CaseLoadResult) => {
    if (result.status === 'ready') {
      setData(result.data)
      setLoadState('ready')
      setNotice(null)
      setSources(result.data.sources)
      // 真实案例含登陆点时自动开启“登陆点”图层
      if (result.data.landfalls.length > 0) {
        setActiveLayers((prev) => (prev.includes('landfalls') ? prev : [...prev, 'landfalls']))
      }
    } else if (result.status === 'unavailable') {
      setData(null)
      setLoadState('unavailable')
      setNotice(result.reason)
      setSources(result.sources)
    } else {
      setData(null)
      setLoadState('error')
      setNotice(result.message)
      setSources([])
    }
  }, [])

  /* 案例加载（切换案例即重新加载；失败绝不静默回退） */
  useEffect(() => {
    setCurrentIndex(0)
    setPlaying(false)
    setRiskQuery(null)
    setLoadState('loading')
    setNotice(null)
    setSources([])

    const tc = getTyphoonCase(activeCaseId)
    const cached = caseCacheRef.current.get(tc.id)
    if (cached) {
      applyResult(cached)
      return
    }

    let cancelled = false
    loadCase(tc).then((result) => {
      if (cancelled) return
      caseCacheRef.current.set(tc.id, result)
      applyResult(result)
    })
    return () => {
      cancelled = true
    }
  }, [activeCaseId, applyResult])

  /* 时间轴自动播放（按时次序号推进，间隔由数据决定，无固定步长假设） */
  useEffect(() => {
    if (!playing || !data) return
    const timer = window.setInterval(() => {
      setCurrentIndex((i) => {
        const next = i + 1
        if (next >= data.track.length) {
          setPlaying(false)
          return 0
        }
        return next
      })
    }, 900)
    return () => window.clearInterval(timer)
  }, [playing, data])

  const handleChapterSelect = (id: ChapterId) => {
    setActiveChapterId(id)
    setVisited((prev) => (prev.includes(id) ? prev : [...prev, id]))
    const defaults = getChapter(id).defaultLayers
    setActiveLayers((prev) => [...new Set([...prev, ...defaults])])
  }

  const handleNextChapter = () => {
    const idx = CHAPTER_ORDER.indexOf(activeChapterId)
    if (idx >= 0 && idx < CHAPTER_ORDER.length - 1) {
      handleChapterSelect(CHAPTER_ORDER[idx + 1])
    }
  }

  const handleStartChase = () => {
    try {
      localStorage.setItem('typhoon-intro-seen', '1')
    } catch {
      /* 忽略存储失败 */
    }
    setShowIntro(false)
    setActiveCaseId('yagi-2024')
    handleChapterSelect('origin')
  }

  const handleSkipIntro = () => {
    try {
      localStorage.setItem('typhoon-intro-seen', '1')
    } catch {
      /* 忽略存储失败 */
    }
    setShowIntro(false)
  }

  const handleToggleLayer = (id: LayerId) => {
    setActiveLayers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const timelineSourceLabel = data
    ? `${data.kind === 'demo' ? 'DEMO' : 'REAL'} · ${data.caseInfo.chineseName}`
    : ''

  /* 登陆事件与时间轴临近高亮（只高亮，绝不改变用户时间索引 / 不强制跳转） */
  const events = useMemo(() => data?.events ?? [], [data])
  const currentTime = data?.track[currentIndex]?.time ?? null
  const activeEventIds = useMemo(() => {
    if (!currentTime || events.length === 0) return []
    const t = new Date(currentTime).getTime()
    const windowMs = LANDFALL_HIGHLIGHT_WINDOW_HOURS * 3_600_000
    return events
      .filter((e) => Math.abs(new Date(e.timestamp).getTime() - t) <= windowMs)
      .map((e) => e.id)
  }, [currentTime, events])

  /* 环境观测：选择时间轴最近的真实卫星帧 / SST 日期（帧与轨迹时间差在状态条中明示） */
  const satelliteFrame = useMemo(() => {
    const frames = data?.environment?.satellite ?? []
    if (!frames.length || !currentTime) return null
    const t = new Date(currentTime).getTime()
    let best = frames[0]
    let bestDiff = Infinity
    for (const f of frames) {
      const d = Math.abs(new Date(f.timestamp).getTime() - t)
      if (d < bestDiff) {
        bestDiff = d
        best = f
      }
    }
    return best
  }, [data, currentTime])

  const sstFrame = useMemo(() => {
    const frames = data?.environment?.sst ?? []
    if (!frames.length) return null
    const t = currentTime ? new Date(currentTime).getTime() : Date.now()
    let best = frames[0]
    let bestDiff = Infinity
    for (const f of frames) {
      const d = Math.abs(new Date(`${f.date}T12:00:00Z`).getTime() - t)
      if (d < bestDiff) {
        bestDiff = d
        best = f
      }
    }
    return best
  }, [data, currentTime])

  const envUnavailable = data?.environment?.status !== 'available'

  return (
    <div className={styles.app}>
      <Header
        activeCase={activeCase}
        loadState={loadState}
        onCaseChange={setActiveCaseId}
        onShowIntro={() => setShowIntro(true)}
      />
      <div className={styles.appBody}>
        <aside className={styles.chapterCol}>
          <ChapterNavigation
            activeId={activeChapterId}
            onSelect={handleChapterSelect}
            visited={visited}
          />
        </aside>

        <main className={styles.mapCol}>
          <TyphoonMap
            data={data}
            activeLayers={activeLayers}
            currentPointIndex={currentIndex}
            highlightLandfallIds={activeEventIds}
            satelliteFrame={satelliteFrame}
            sstFrame={sstFrame}
            satelliteOpacity={satelliteOpacity}
            onRiskQuery={setRiskQuery}
            flyToAoiSignal={aoiSignal}
            showRiskAoi={chapter.id === 'risk' && data?.risk?.status === 'available'}
          />
          <EnvironmentStatus
            satelliteFrame={satelliteFrame}
            sstFrame={sstFrame}
            currentTime={currentTime}
          />
          <div className={styles.layerOverlay}>
            <LayerControl
              active={activeLayers}
              onToggle={handleToggleLayer}
              envUnavailable={envUnavailable}
              satelliteOpacity={satelliteOpacity}
              onSatelliteOpacityChange={setSatelliteOpacity}
            />
          </div>
          <div className={styles.timelineOverlay}>
            <Timeline
              points={data?.track ?? []}
              index={currentIndex}
              playing={playing}
              onIndexChange={setCurrentIndex}
              onTogglePlay={() => setPlaying((p) => !p)}
              sourceLabel={timelineSourceLabel}
              events={events}
              activeEventIds={activeEventIds}
            />
          </div>
          {notice && (
            <div
              className={`${styles.mapNotice} ${
                loadState === 'error' ? styles.mapNoticeError : ''
              }`}
            >
              <p className={styles.noticeTitle}>
                {loadState === 'error' ? '数据加载失败' : '真实数据待接入'}
              </p>
              <p className={styles.noticeText}>{notice}</p>
            </div>
          )}
          {chapter.id === 'risk' && data?.risk?.status === 'available' && (
            <button
              type="button"
              className={styles.aoiButton}
              onClick={() => setAoiSignal((s) => s + 1)}
              title="飞行定位到风险分析区（海南北部—琼州海峡—雷州半岛）"
            >
              🎯 定位到风险分析区
            </button>
          )}
          {showIntro && (
            <div className={styles.introOverlay}>
              <div className={styles.introCard}>
                <p className={styles.introTitle}>跟着六个问题，一起追踪一场真实台风</p>
                <p className={styles.introText}>
                  从“它从哪里来”到“我们该怎么做”，用真实数据讲完 2024 年超强台风
                  “摩羯”的完整故事。
                </p>
                <div className={styles.introActions}>
                  <button type="button" className={styles.introStart} onClick={handleStartChase}>
                    开始追风
                  </button>
                  <button type="button" className={styles.introSkip} onClick={handleSkipIntro}>
                    先随便看看
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className={styles.infoCol}>
          <InfoPanel
            chapter={chapter}
            data={data}
            loadState={loadState}
            notice={notice}
            sources={sources}
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
            satelliteFrame={satelliteFrame}
            sstFrame={sstFrame}
            riskQuery={riskQuery}
            onFocusAoi={() => setAoiSignal((s) => s + 1)}
            onNextChapter={handleNextChapter}
          />
        </aside>
      </div>
    </div>
  )
}
