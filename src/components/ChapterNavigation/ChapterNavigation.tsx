import type { ChapterId } from '../../types'
import { CHAPTERS } from '../../data/chapters'
import styles from './ChapterNavigation.module.css'

interface ChapterNavigationProps {
  activeId: ChapterId
  onSelect: (id: ChapterId) => void
  /** 已浏览过的章节（轻量标记，非游戏化） */
  visited?: ChapterId[]
}

export default function ChapterNavigation({
  activeId,
  onSelect,
  visited = [],
}: ChapterNavigationProps) {
  return (
    <nav className={styles.nav} aria-label="章节导航">
      <p className={styles.heading}>内容导览 · 六大核心问题</p>
      <ul className={styles.list}>
        {CHAPTERS.map((chapter) => {
          const active = chapter.id === activeId
          const seen = !active && visited.includes(chapter.id)
          return (
            <li key={chapter.id}>
              <button
                type="button"
                className={`${styles.item} ${active ? styles.active : ''}`}
                onClick={() => onSelect(chapter.id)}
                aria-current={active ? 'page' : undefined}
              >
                <span className={styles.index}>{chapter.index}</span>
                <span className={styles.body}>
                  <span className={styles.title}>
                    {chapter.title}
                    {seen && <span className={styles.seenTag}>已读</span>}
                  </span>
                  <span className={styles.subtitle}>{chapter.subtitle}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
