import type { LayerId } from '../../types'
import { LAYER_DEFS } from '../../data/layers'
import styles from './LayerControl.module.css'

interface LayerControlProps {
  active: LayerId[]
  onToggle: (id: LayerId) => void
  /** 环境观测资料是否待接入（待接入时卫星/SST 显示提示并禁用） */
  envUnavailable?: boolean
  /** 真实卫星云图透明度（0.2–1） */
  satelliteOpacity?: number
  onSatelliteOpacityChange?: (value: number) => void
}

const ENV_LAYER_IDS: LayerId[] = ['envSatellite', 'envSst']

export default function LayerControl({
  active,
  onToggle,
  envUnavailable = false,
  satelliteOpacity = 0.7,
  onSatelliteOpacityChange,
}: LayerControlProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.title}>地图图层</p>
      <ul>
        {LAYER_DEFS.map((layer) => {
          const checked = active.includes(layer.id)
          const isEnvLayer = ENV_LAYER_IDS.includes(layer.id)
          const disabled = isEnvLayer && envUnavailable
          const hint = disabled ? '真实资料待接入' : layer.hint
          return (
            <li key={layer.id}>
              <label className={`${styles.item} ${disabled ? styles.itemDisabled : ''}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => onToggle(layer.id)}
                />
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: layer.color }}
                  aria-hidden="true"
                />
                <span className={styles.text}>
                  <span className={styles.label}>{layer.label}</span>
                  <span className={styles.hint}>{hint}</span>
                </span>
              </label>
              {layer.id === 'envSatellite' && checked && !disabled && onSatelliteOpacityChange && (
                <div className={styles.sliderRow}>
                  <span className={styles.sliderLabel}>透明度</span>
                  <input
                    type="range"
                    className={styles.slider}
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={satelliteOpacity}
                    onChange={(e) => onSatelliteOpacityChange(Number(e.target.value))}
                    aria-label="卫星云图透明度"
                  />
                  <span className={styles.sliderValue}>{Math.round(satelliteOpacity * 100)}%</span>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className={styles.foot}>图层开关 · 数据状态见页首徽标与信息面板</p>
    </div>
  )
}
