import type { LoadState, TyphoonCase } from '../../types'
import { TYPHOON_CASES } from '../../data/cases'
import styles from './Header.module.css'

interface HeaderProps {
  activeCase: TyphoonCase
  loadState: LoadState
  onCaseChange: (caseId: string) => void
  /** 重新打开首次进入引导 */
  onShowIntro?: () => void
}

function getStatusBadge(loadState: LoadState, kind: string): { text: string; cls: string } {
  if (loadState === 'loading') return { text: '加载中…', cls: styles.badgeDim }
  if (loadState === 'error') return { text: '数据加载失败', cls: styles.badgeError }
  if (loadState === 'unavailable') return { text: '真实数据待接入', cls: styles.badgeWarn }
  return kind === 'demo'
    ? { text: 'DEMO', cls: styles.badgeWarn }
    : { text: 'REAL', cls: styles.badgeOk }
}

function TyphoonMark() {
  return (
    <svg viewBox="0 0 64 64" className={styles.logo} aria-hidden="true">
      <circle cx="32" cy="32" r="24" fill="none" stroke="var(--c-accent)" strokeWidth="4" />
      <path
        d="M32 12a20 20 0 1 0 20 20"
        fill="none"
        stroke="var(--c-accent-soft)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="4.5" fill="var(--c-text)" />
    </svg>
  )
}

export default function Header({ activeCase, loadState, onCaseChange, onShowIntro }: HeaderProps) {
  const badge = getStatusBadge(loadState, activeCase.kind)
  const caseLabel = [
    activeCase.chineseName,
    activeCase.typhoonNumber ? `${activeCase.typhoonNumber} 号` : '',
    activeCase.year ? `${activeCase.year}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <TyphoonMark />
        <div>
          <h1 className={styles.title}>AI 台风风险灵境</h1>
          <p className={styles.subtitle}>和 AI 一起追“风”去</p>
        </div>
      </div>

      <div className={styles.meta}>
        <label className={styles.caseSelectLabel}>
          <span className={styles.caseSelectCaption}>案例</span>
          <select
            className={styles.caseSelect}
            value={activeCase.id}
            onChange={(e) => onCaseChange(e.target.value)}
            aria-label="选择台风案例"
          >
            {TYPHOON_CASES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.kind === 'demo'
                  ? '演示 · 合成轨迹'
                  : `真实 · ${c.chineseName}（${c.typhoonNumber} 号）`}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.caseName}>{caseLabel}</span>
        <span className={`${styles.badge} ${badge.cls}`}>{badge.text}</span>
        {onShowIntro && (
          <button
            type="button"
            className={styles.introBtn}
            onClick={onShowIntro}
            title="重新查看作品引导"
          >
            ❓ 引导
          </button>
        )}
        <span className={styles.event}>首届时空灵境 · AI 地理科普行动</span>
      </div>
    </header>
  )
}
