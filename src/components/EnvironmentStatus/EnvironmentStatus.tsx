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

/** 地图上的环境观测状态条：明确影像时间与时间差，避免用户误以为影像与轨迹点同时 */
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
          卫星影像时间：{formatClock(satelliteFrame.timestamp, 8)}（北京）
          <span className={styles.diff}>{diffLabel(satelliteFrame.timestamp, currentTime)}</span>
        </p>
      )}
      {sstFrame && (
        <p className={styles.line}>
          <span className={styles.dot} style={{ backgroundColor: '#ff9e5e' }} aria-hidden="true" />
          海表温度（SST）：{sstFrame.date}（日尺度）
          <span className={styles.diff}>{diffLabel(`${sstFrame.date}T12:00:00Z`, currentTime)}</span>
        </p>
      )}
      <p className={styles.source}>来源：国家卫星气象中心 · FY-4B AGRI（处理说明见信息面板）</p>
    </div>
  )
}
