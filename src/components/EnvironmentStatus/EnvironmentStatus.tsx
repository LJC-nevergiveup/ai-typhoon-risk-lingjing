import type { SatelliteFrame, SstFrame } from '../../types'
import { formatClock } from '../../utils/format'
import styles from './EnvironmentStatus.module.css'

interface EnvironmentStatusProps {
  satelliteFrame: SatelliteFrame | null
  sstFrame: SstFrame | null
  /** 当前轨迹时次（ISO UTC），用于显示影像与轨迹的时间差 */
  currentTime: string | null
}

function diffLabel(frameTime: string, currentTime: string | null): string {
  if (!currentTime) return ''
  const diffMs = new Date(frameTime).getTime() - new Date(currentTime).getTime()
  const hours = Math.round(diffMs / 3_600_000)
  const abs = Math.abs(hours)
  if (abs === 0) return '（与当前时次同时）'
  return `（与当前时次相差约 ${abs} 小时）`
}

/**
 * 地图上的环境观测状态条：明确影像时间、时间差与数据性质，
 * 避免用户把「卫星观测」与「SST 日分析场」混为一谈，或误以为影像与轨迹点同时。
 */
export default function EnvironmentStatus({
  satelliteFrame,
  sstFrame,
  currentTime,
}: EnvironmentStatusProps) {
  if (!satelliteFrame && !sstFrame) return null
  return (
    <div className={styles.bar}>
      {satelliteFrame && (
        <p className={styles.line}>
          <span className={styles.dot} style={{ backgroundColor: '#ffffff' }} aria-hidden="true" />
          卫星影像（观测）：{formatClock(satelliteFrame.timestamp, 8)}（北京）·{' '}
          {satelliteFrame.satellite} {satelliteFrame.instrument}
          <span className={styles.diff}>{diffLabel(satelliteFrame.timestamp, currentTime)}</span>
        </p>
      )}
      {sstFrame && (
        <p className={styles.line}>
          <span className={styles.dot} style={{ backgroundColor: '#ff9e5e' }} aria-hidden="true" />
          海表温度 SST（日分析场，多源卫星融合）：{sstFrame.date} · {sstFrame.unit}
          <span className={styles.diff}>{diffLabel(`${sstFrame.date}T12:00:00Z`, currentTime)}</span>
        </p>
      )}
      <p className={styles.source}>
        卫星影像为 FY-4B AGRI 观测；SST 为 NOAA Coral Reef Watch 日分析场（非单星瞬时观测）。
        处理与来源见信息面板「环境观测资料」。
      </p>
    </div>
  )
}
