import { useState } from 'react'
import type { TyphoonEvent, TyphoonPoint } from '../../types'
import { formatClock, formatDateBeijing } from '../../utils/format'
import styles from './Timeline.module.css'

interface TimelineProps {
  points: TyphoonPoint[]
  index: number
  playing: boolean
  onIndexChange: (index: number) => void
  onTogglePlay: () => void
  /** 数据模式与案例标签，如 "REAL · 摩羯" / "DEMO · 合成演示台风" */
  sourceLabel?: string
  /** 台风事件（登陆等），与轨迹共用统一 UTC 时间基准 */
  events?: TyphoonEvent[]
  /** 当前时间临近（±窗口）的事件 id，用于高亮（不改变时间索引） */
  activeEventIds?: string[]
}

/**
 * 底部时间轴：完全由轨迹点 timestamp 驱动。
 * 不假设固定时间步长、固定点数或固定起止时间，
 * 播放按“时次序号”前进，间隔由数据本身决定。
 * 事件标记按事件 timestamp 相对轨迹起止的位置放置。
 */
export default function Timeline({
  points,
  index,
  playing,
  onIndexChange,
  onTogglePlay,
  sourceLabel = '',
  events = [],
  activeEventIds = [],
}: TimelineProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const disabled = points.length === 0
  const current = points[index]
  const first = points[0]
  const last = points[points.length - 1]
  const range =
    first && last && first !== last
      ? `${formatDateBeijing(first.time)} — ${formatDateBeijing(last.time)}`
      : first
        ? formatDateBeijing(first.time)
        : ''

  const startMs = first ? new Date(first.time).getTime() : 0
  const endMs = last ? new Date(last.time).getTime() : 0
  const markers =
    startMs && endMs && endMs > startMs
      ? events
          .map((e) => ({
            ...e,
            pct: Math.max(
              0,
              Math.min(
                100,
                ((new Date(e.timestamp).getTime() - startMs) / (endMs - startMs)) * 100,
              ),
            ),
          }))
          .filter((m) => m.pct >= 0 && m.pct <= 100)
      : []

  const selectedEvent = markers.find((m) => m.id === selectedEventId) ?? null

  return (
    <div className={styles.timeline}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.btn}
          disabled={disabled}
          onClick={() => onIndexChange(0)}
          title="回到起点"
        >
          ⏮
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.playBtn}`}
          disabled={disabled}
          onClick={onTogglePlay}
          title={playing ? '暂停' : '播放'}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          className={styles.range}
          min={0}
          max={Math.max(points.length - 1, 0)}
          value={index}
          disabled={disabled}
          onChange={(e) => onIndexChange(Number(e.target.value))}
          aria-label="时间轴"
        />
        <span className={styles.time}>
          {current ? formatClock(current.time, 8).slice(5) : '--'}
        </span>
        {current && <span className={styles.category}>{current.category}</span>}
      </div>

      {markers.length > 0 && (
        <div className={styles.markerRow}>
          {markers.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.marker} ${
                activeEventIds.includes(m.id) ? styles.markerActive : ''
              }`}
              style={{ left: `${m.pct}%` }}
              title={`${m.title}｜北京 ${formatClock(m.timestamp, 8)}｜UTC ${formatClock(m.timestamp, 0)}｜${m.description}`}
              onClick={() => setSelectedEventId((cur) => (cur === m.id ? null : m.id))}
            >
              <span aria-hidden="true">▲</span>
              <span className={styles.markerLabel}>{m.shortLabel ?? m.title}</span>
            </button>
          ))}
        </div>
      )}

      {selectedEvent && (
        <div className={styles.eventInfo}>
          <span className={styles.eventDot} aria-hidden="true">
            ●
          </span>
          <span>{selectedEvent.title}</span>
          <span className={styles.eventTime}>
            北京 {formatClock(selectedEvent.timestamp, 8)} · UTC{' '}
            {formatClock(selectedEvent.timestamp, 0)}
          </span>
          <span className={styles.eventDesc}>{selectedEvent.description}</span>
        </div>
      )}

      <div className={styles.note}>
        <span>{points.length > 0 ? `时次 ${index + 1} / ${points.length}` : '无轨迹数据'}</span>
        <span>
          {sourceLabel}
          {sourceLabel && range ? ' · ' : ''}
          {range} · 北京时间（UTC+8）
        </span>
      </div>
    </div>
  )
}
