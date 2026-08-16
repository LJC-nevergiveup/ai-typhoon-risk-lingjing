import { useMemo } from 'react'
import type {
  ActiveMapData,
  Chapter,
  LayerId,
  LoadState,
  RiskQuery,
  SatelliteFrame,
  SourceInfo,
  SstFrame,
} from '../../types'
import { buildTrackChartOption } from '../../services/chartOptions'
import { STORY_ENDING } from '../../data/chapters'
import { SOURCE_TYPE_LABELS, formatClock, formatTimeBeijing } from '../../utils/format'
import EChart from '../EChart/EChart'
import styles from './InfoPanel.module.css'

interface InfoPanelProps {
  chapter: Chapter
  data: ActiveMapData | null
  loadState: LoadState
  /** unavailable / error 时的说明文字 */
  notice: string | null
  sources: SourceInfo[]
  activeLayers?: LayerId[]
  onToggleLayer?: (id: LayerId) => void
  /** 时间轴最近的真实卫星帧 */
  satelliteFrame?: SatelliteFrame | null
  /** 时间轴最近的真实 SST 帧 */
  sstFrame?: SstFrame | null
  /** 风险分析点击查询结果 */
  riskQuery?: RiskQuery | null
  /** 点击“定位到分析区”时触发地图飞行 */
  onFocusAoi?: () => void
  /** 点击“下一问”时切换章节 */
  onNextChapter?: () => void
}

/** 右侧信息面板：章节要点 + 章节专题 + 图表 + 数据来源 + 数据状态 */
export default function InfoPanel({
  chapter,
  data,
  loadState,
  notice,
  sources,
  activeLayers = [],
  onToggleLayer,
  satelliteFrame = null,
  sstFrame = null,
  riskQuery = null,
  onFocusAoi,
  onNextChapter,
}: InfoPanelProps) {
  const chartOption = useMemo(
    () => (data ? buildTrackChartOption(data.track) : null),
    [data],
  )
  const envAvailable = data?.environment?.status === 'available'
  const envSatelliteOn = activeLayers.includes('envSatellite')
  const envSstOn = activeLayers.includes('envSst')

  return (
    <div className={styles.panel}>
      <section>
        <p className={styles.sectionTitle}>当前章节 · {chapter.index}</p>
        <h2 className={styles.question}>{chapter.question}</h2>
        <p className={styles.chapterTitle}>{chapter.title}</p>
        <p className={styles.subtitle}>{chapter.subtitle}</p>
      </section>

      <section>
        <p className={styles.sectionTitle}>本节要点</p>
        <ul className={styles.points}>
          {chapter.keyPoints.map((point) => (
            <li key={point} className={styles.point}>
              <span className={styles.arrow}>▸</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {chapter.id === 'origin' && data && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>本章专题 · 台风从哪来（三步走）</span>
            <span className={`${styles.kindChip} ${data.kind === 'demo' ? styles.kindDemo : styles.kindReal}`}>
              {data.kind === 'demo' ? 'DEMO' : 'REAL'}
            </span>
          </div>

          <div className={styles.step}>
            <p className={styles.stepTitle}>Step 1 · 它在哪里出现？</p>
            {data.track.length > 0 ? (
              <p className={styles.stepText}>
                YAGI 于 {formatTimeBeijing(data.track[0].time)}（UTC{' '}
                {formatClock(data.track[0].time, 0)}）首次记录于 {data.track[0].lon.toFixed(1)}°E、
                {data.track[0].lat.toFixed(1)}°N 的西北太平洋洋面，初始等级
                {data.track[0].category}。
              </p>
            ) : (
              <p className={styles.dim}>等待轨迹数据…</p>
            )}
          </div>

          <div className={styles.step}>
            <p className={styles.stepTitle}>Step 2 · 海洋提供了什么？</p>
            <p className={styles.stepText}>
              温暖海洋能够为热带气旋的发展提供重要的热量和水汽条件，但台风的形成和增强
              还受到大气环流、水汽、垂直风切变等多种因素影响。
            </p>
            {envAvailable ? (
              <>
                {sstFrame && (
                  <p className={styles.stepMeta}>
                    SST 资料：{sstFrame.date}（{sstFrame.satellite} {sstFrame.instrument} ·
                    {sstFrame.unit}）
                  </p>
                )}
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => onToggleLayer?.('envSst')}
                >
                  {envSstOn ? '关闭 SST 图层' : '开启 SST 图层'}
                </button>
              </>
            ) : (
              <p className={styles.warn}>
                真实资料待接入：需人工从风云卫星遥感数据服务网下载 FY-4B AGRI SST 产品
                （清单见 public/data/raw/nsmc/README.md）。
              </p>
            )}
          </div>

          <div className={styles.step}>
            <p className={styles.stepTitle}>Step 3 · 卫星看到了什么？</p>
            {envAvailable ? (
              <>
                {satelliteFrame && (
                  <p className={styles.stepMeta}>
                    最近卫星帧：{formatTimeBeijing(satelliteFrame.timestamp)}（
                    {satelliteFrame.satellite} {satelliteFrame.instrument} ·{' '}
                    {satelliteFrame.product}）
                  </p>
                )}
                <button
                  type="button"
                  className={styles.stepBtn}
                  onClick={() => onToggleLayer?.('envSatellite')}
                >
                  {envSatelliteOn ? '关闭卫星云图图层' : '开启卫星云图图层'}
                </button>
              </>
            ) : (
              <p className={styles.warn}>
                真实资料待接入：需人工从风云卫星遥感数据服务网下载 FY-4B AGRI 图像产品。
              </p>
            )}
          </div>
        </section>
      )}

      {chapter.id === 'risk' && data && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>本章专题 · 哪里更危险（四步）</span>
            <span className={`${styles.kindChip} ${styles.kindReal}`}>REAL</span>
          </div>
          {!data.risk || data.risk.status !== 'available' ? (
            <p className={styles.warn}>
              风险分析数据未就绪（DEMO 案例无此数据；若为 REAL 案例请刷新页面重试）。
            </p>
          ) : (
            <>
              <button type="button" className={styles.stepBtn} onClick={onFocusAoi}>
                🎯 定位到分析区（海南北部—琼州海峡—雷州半岛）
              </button>
              <p className={styles.stepMeta}>
                地图上的黄色虚线框即为分析区范围；框内点击任意位置可查询空间关注提示。
              </p>
              <div className={styles.step}>
                <p className={styles.stepTitle}>Step 1 · 地形会改变风险吗？</p>
                <p className={styles.stepText}>
                  低海拔地区更易受到风暴潮与内涝影响，但“低于某一高程一定会被淹没”并不成立；
                  地形图层仅展示高程分级（0–5 / 5–10 / 10–30 / &gt;30 m）。
                </p>
                <button type="button" className={styles.stepBtn} onClick={() => onToggleLayer?.('riskTerrain')}>
                  {activeLayers.includes('riskTerrain') ? '关闭地形图层' : '开启地形图层'}
                </button>
              </div>
              <div className={styles.step}>
                <p className={styles.stepTitle}>Step 2 · 哪里暴露的人更多？</p>
                <p className={styles.stepText}>
                  人口暴露只表示人口的空间分布（人/km²），不代表伤亡风险。
                </p>
                <button type="button" className={styles.stepBtn} onClick={() => onToggleLayer?.('riskPopulation')}>
                  {activeLayers.includes('riskPopulation') ? '关闭人口暴露图层' : '开启人口暴露图层'}
                </button>
              </div>
              <div className={styles.step}>
                <p className={styles.stepTitle}>Step 3 · 摩羯从哪里经过？</p>
                <p className={styles.stepText}>
                  路径邻近度是到 YAGI 真实轨迹的几何距离（km），不等于风圈或风速影响范围。
                </p>
                <button type="button" className={styles.stepBtn} onClick={() => onToggleLayer?.('riskProximity')}>
                  {activeLayers.includes('riskProximity') ? '关闭路径邻近度图层' : '开启路径邻近度图层'}
                </button>
              </div>
              <div className={styles.step}>
                <p className={styles.stepTitle}>Step 4 · 为什么有些区域值得重点关注？</p>
                <p className={styles.stepText}>
                  按确定性规则组合三个因子（低洼 + 人口暴露 + 路径邻近度）给出
                  “重点关注 / 较高关注 / 一般关注”提示；规则可审计，未做权重调参。
                </p>
                <button type="button" className={styles.stepBtn} onClick={() => onToggleLayer?.('riskAttention')}>
                  {activeLayers.includes('riskAttention') ? '关闭空间关注提示图层' : '开启空间关注提示图层'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {chapter.id === 'track' && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>本章专题 · 台风往哪去</span>
            <span className={`${styles.kindChip} ${data ? styles.kindReal : styles.kindDemo}`}>REAL</span>
          </div>
          <ul className={styles.points}>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>台风并不会“随意乱走”：它的移动主要受大尺度大气环流的引导。</span></li>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>西北太平洋台风常沿副热带高压南侧的引导气流向西—西北移动。</span></li>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>副热带高压的位置、强弱与进退，会明显影响台风的走向。</span></li>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>周围天气系统的变化，可能让台风在某一时刻发生转向。</span></li>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>路径预测不是一成不变：随着新观测不断加入，预报会滚动更新。</span></li>
          </ul>
          <p className={styles.stepText}>
            {data?.schematic?.note ??
              '机制示意，不代表 YAGI 当时真实大气分析场。'}
          </p>
          {!data?.schematic ? (
            <p className={styles.warn}>示意图层未就绪：请确认已切换到「摩羯」REAL 案例，并刷新页面重试。</p>
          ) : (
            <>
              <button type="button" className={styles.stepBtn} onClick={() => onToggleLayer?.('steeringSchematic')}>
                {activeLayers.includes('steeringSchematic') ? '关闭移动机制示意' : '开启移动机制示意'}
              </button>
              <div className={styles.step}>
                <p className={styles.stepTitle}>为什么预测路径会变？</p>
                <p className={styles.stepText}>
                  预报基于对大气状态的观测与模拟。观测越多、时间越近，确定性越高；远期的路径
                  往往存在一个“可能范围”。下面用多条示意路径表达这种不确定性——
                  <strong>预测不确定性示意，非真实集合预报</strong>。
                </p>
                <button type="button" className={styles.stepBtn} onClick={() => onToggleLayer?.('uncertaintySchematic')}>
                  {activeLayers.includes('uncertaintySchematic') ? '关闭预测不确定性示意' : '开启预测不确定性示意'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {chapter.id === 'ai' && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>本章专题 · AI 在本作品里做了什么</span>
            <span className={`${styles.kindChip} ${styles.kindReal}`}>REAL</span>
          </div>
          <p className={styles.stepTitle}>从数据到地图的真实工作流</p>
          <ol className={styles.pipeline}>
            <li>官方台风轨迹（台风网历史数据）</li>
            <li>↓</li>
            <li>卫星遥感（FY-4B 真彩 / SST 分析场）</li>
            <li>↓</li>
            <li>DEM / 人口暴露</li>
            <li>↓</li>
            <li>空间分析（路径邻近度 / 关注分级）</li>
            <li>↓</li>
            <li>AI 辅助数据处理与程序开发</li>
            <li>↓</li>
            <li>人工科学核验（数值、来源、口径）</li>
            <li>↓</li>
            <li>交互式地理科普地图（你现在看到的页面）</li>
          </ol>
          <p className={styles.stepTitle}>AI 具体帮了什么忙</p>
          <ul className={styles.points}>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>AI 辅助整理多源数据：统一轨迹、登陆点、卫星、SST、地形与人口的格式与口径。</span></li>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>AI 辅助生成数据处理与可视化代码：重投影、分级、色带、图表与导入脚本。</span></li>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>AI 辅助构建交互式地图：图层、时间轴、点击查询与章节联动。</span></li>
            <li className={styles.point}><span className={styles.arrow}>▸</span><span>AI 辅助科普表达：把专业内容转成公众能读懂的语言。</span></li>
          </ul>
          <p className={styles.stepTitle}>AI 为什么不能直接相信？</p>
          <p className={styles.stepText}>
            真实案例：原始台风网数据中有一个字符串字段，最初可能被理解为“登陆标志”。人工审计后
            发现其语义无法确认，最终把它改名为 <code className={styles.code}>nmcFlagRaw</code>，
            并明确规定不得将其作为登陆判断依据。
          </p>
          <p className={styles.disclaimer}>
            AI 负责辅助，最终科学事实由人工核验和权威资料确认。
          </p>
        </section>
      )}

      {chapter.id === 'action' && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>本章专题 · 台风来临前后怎么做</span>
            <span className={`${styles.kindChip} ${styles.kindReal}`}>REAL</span>
          </div>
          <div className={styles.step}>
            <p className={styles.stepTitle}>A · 沿海地区</p>
            <ul className={styles.points}>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>远离海岸、海堤、港口等危险区域</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>不观浪、不追风</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>关注官方转移通知，有需要时提前撤离</span></li>
            </ul>
          </div>
          <div className={styles.step}>
            <p className={styles.stepTitle}>B · 低洼城区</p>
            <ul className={styles.points}>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>注意积水与内涝风险，不贸然涉水</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>避免进入深水区域</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>注意地下空间和低洼道路</span></li>
            </ul>
          </div>
          <div className={styles.step}>
            <p className={styles.stepTitle}>C · 山区</p>
            <ul className={styles.points}>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>远离沟谷和陡坡</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>警惕山洪、滑坡等次生灾害</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>强降雨期间减少进入山区危险区域</span></li>
            </ul>
          </div>
          <div className={styles.step}>
            <p className={styles.stepTitle}>D · 家中</p>
            <ul className={styles.points}>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>关闭门窗，固定室外易坠落物</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>准备饮水和食品</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>保持手机和充电设备可用</span></li>
              <li className={styles.point}><span className={styles.arrow}>▸</span><span>持续关注官方预警</span></li>
            </ul>
          </div>
          <p className={styles.stepTitle}>台风应急包</p>
          <ul className={styles.kitGrid}>
            {[
              ['💧', '饮用水'],
              ['🥫', '易储存食品'],
              ['🔦', '手电'],
              ['🔋', '充电宝 / 备用电源'],
              ['💊', '常用药'],
              ['🪪', '身份证件'],
              ['🩹', '基础急救用品'],
              ['📱', '必要通信设备'],
            ].map(([icon, label]) => (
              <li key={label} className={styles.kitItem}>
                <span className={styles.kitIcon} aria-hidden="true">{icon}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <p className={styles.disclaimer}>
            先看官方预警，再做行动判断。本作品用于科普，不能替代气象部门预警，也不能替代
            应急管理部门撤离指令；实际行动以官方信息为准。
          </p>
        </section>
      )}

      {riskQuery && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>点击查询 · 空间关注提示</span>
            <span className={styles.pendingChip}>科普分析</span>
          </div>
          <p className={styles.queryLocation}>
            地点：{riskQuery.lon.toFixed(2)}°E，{riskQuery.lat.toFixed(2)}°N
          </p>
          {riskQuery.outOfAoi ? (
            <>
              <p className={styles.warn}>
                该位置不在风险分析范围内（分析区：108.2–111.6°E，18.9–21.2°N，
                即海南北部—琼州海峡—雷州半岛）。
              </p>
              <button type="button" className={styles.stepBtn} onClick={onFocusAoi}>
                🎯 定位到分析区
              </button>
            </>
          ) : (
            <>
              <div className={styles.kv}>
                <span>海拔</span>
                <span>{riskQuery.isLand && riskQuery.elevation != null ? `${riskQuery.elevation} m` : '海域（无高程）'}</span>
              </div>
              <div className={styles.kv}>
                <span>地形关注程度</span>
                <span>{riskQuery.terrainLabel}</span>
              </div>
              <div className={styles.kv}>
                <span>人口暴露</span>
                <span>
                  {riskQuery.isLand && riskQuery.popDensity > 0
                    ? `${riskQuery.popDensity.toFixed(0)} 人/km² · ${riskQuery.popLabel}`
                    : riskQuery.popLabel}
                </span>
              </div>
              <div className={styles.kv}>
                <span>距摩羯真实路径</span>
                <span>{riskQuery.distKm.toFixed(1)} km（{riskQuery.proxLabel}）</span>
              </div>
              <p className={styles.queryAttention}>
                空间提示：
                <span className={riskQuery.attentionLevel === 3 ? styles.attHigh : riskQuery.attentionLevel === 2 ? styles.attMedium : styles.attLow}>
                  {riskQuery.attentionLabel}
                </span>
              </p>
              <p className={styles.queryDisclaimer}>⚠ {riskQuery.disclaimer}</p>
            </>
          )}
        </section>
      )}

      {data && data.environment && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>环境观测资料</span>
            {envAvailable ? (
              <span className={`${styles.kindChip} ${styles.kindReal}`}>REAL</span>
            ) : (
              <span className={styles.pendingChip}>待接入</span>
            )}
          </div>
          {envAvailable ? (
            <>
              {data.environment.satellite.length > 0 && (
                <p className={styles.frameGroupTitle}>卫星影像帧</p>
              )}
              <ul className={styles.frameList}>
                {[...data.environment.satellite]
                  .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                  .map((f) => (
                    <li key={f.id} className={styles.frameItem}>
                      {formatTimeBeijing(f.timestamp)} · {f.satellite} {f.instrument} · {f.product}
                      <span className={styles.frameMeta}>
                        处理：{f.processing.join(' / ')} ·{' '}
                        <a href={f.sourceUrl} target="_blank" rel="noreferrer">
                          来源 ↗
                        </a>
                      </span>
                    </li>
                  ))}
              </ul>
              {data.environment.sst.length > 0 && (
                <p className={styles.frameGroupTitle}>海表温度（SST）</p>
              )}
              <ul className={styles.frameList}>
                {[...data.environment.sst]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((f) => (
                    <li key={f.id} className={styles.frameItem}>
                      {f.date} · {f.satellite} {f.instrument} · {f.product}（{f.unit}
                      {f.valueRange ? `，范围 ${f.valueRange[0]}–${f.valueRange[1]}` : ''}）
                      <span className={styles.frameMeta}>
                        色带：{f.legend} · 处理：{f.processing.join(' / ')} ·{' '}
                        <a href={f.sourceUrl} target="_blank" rel="noreferrer">
                          来源 ↗
                        </a>
                      </span>
                    </li>
                  ))}
              </ul>
              {data.environment.sources.length > 0 && (
                <ul className={styles.sources}>
                  {data.environment.sources.map((s) => (
                    <li key={`${s.organization}-${s.datasetName}`} className={styles.source}>
                      <p className={styles.sourceTitle}>
                        <span>{s.organization}</span>
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.datasetName} ↗
                        </a>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className={styles.warn}>
              真实卫星云图与海表温度资料待接入（优先 FY-4B AGRI）。需人工下载，清单见
              public/data/raw/nsmc/README.md；接入前不使用演示图或第三方图冒充。
            </p>
          )}
        </section>
      )}

      {data && data.risk && data.risk.sources.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>风险分析数据来源</span>
            <span className={`${styles.kindChip} ${styles.kindReal}`}>REAL</span>
          </div>
          <ul className={styles.sources}>
            {data.risk.sources.map((s) => (
              <li key={`${s.organization}-${s.datasetName}`} className={styles.source}>
                <p className={styles.sourceTitle}>
                  <span>{s.organization}</span>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.datasetName} ↗
                  </a>
                </p>
                <p className={styles.sourceRole}>
                  {s.sourceType && (
                    <span className={styles.sourceTypeChip}>{SOURCE_TYPE_LABELS[s.sourceType]}</span>
                  )}
                  {s.scope && <span className={styles.sourceScope}>{s.scope}</span>}
                </p>
                <p className={styles.sourceDesc}>{s.description}</p>
              </li>
            ))}
          </ul>
          {data.risk.disclaimer && <p className={styles.disclaimer}>⚠ {data.risk.disclaimer}</p>}
        </section>
      )}

      {data && data.landfalls.length > 0 && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>登陆过程</span>
            <span className={`${styles.kindChip} ${styles.kindReal}`}>REAL</span>
          </div>
          <ol className={styles.landfallList}>
            {[...data.landfalls]
              .sort((a, b) => a.sequence - b.sequence)
              .map((l, i, arr) => {
                const gapHours =
                  i > 0
                    ? Math.round(
                        (new Date(l.timestamp).getTime() -
                          new Date(arr[i - 1].timestamp).getTime()) /
                          3_600_000,
                      )
                    : null
                return (
                  <li key={l.id} className={styles.landfallItem}>
                    {i > 0 && (
                      <p className={styles.landfallGap}>
                        ↓ 继续移动（距上一次登陆约 {gapHours} 小时）
                      </p>
                    )}
                    <p className={styles.landfallSeq}>
                      第 {l.sequence} 次登陆 · {l.locationName}
                    </p>
                    <p className={styles.landfallMeta}>
                      {formatClock(l.timestamp, 8)}（北京） · {l.intensity}
                      {l.maxWindSpeed != null && ` · ${l.maxWindSpeed} m/s`}
                      {l.centralPressure != null && ` · ${l.centralPressure} hPa`}
                    </p>
                    {l.notes && <p className={styles.landfallNote}>{l.notes}</p>}
                  </li>
                )
              })}
          </ol>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>示例图表 · 中心风速与气压（北京时间）</span>
          {data && (
            <span className={`${styles.kindChip} ${data.kind === 'demo' ? styles.kindDemo : styles.kindReal}`}>
              {data.kind === 'demo' ? 'DEMO' : 'REAL'}
            </span>
          )}
        </div>
        {chartOption ? (
          <EChart option={chartOption} height={210} />
        ) : (
          <p className={styles.dim}>暂无轨迹数据，图表等待数据接入…</p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>数据来源</span>
          {data && (
            <span className={`${styles.kindChip} ${data.kind === 'demo' ? styles.kindDemo : styles.kindReal}`}>
              {data.kind === 'demo' ? 'DEMO' : 'REAL'}
            </span>
          )}
        </div>
        {loadState === 'loading' && <p className={styles.dim}>正在加载…</p>}
        {loadState === 'error' && <p className={styles.error}>{notice}</p>}
        {loadState === 'unavailable' && <p className={styles.warn}>{notice}</p>}
        {loadState === 'ready' && sources.length === 0 && (
          <p className={styles.dim}>演示模式：数据为合成示意，无外部数据来源。</p>
        )}
        {sources.length > 0 && (
          <ul className={styles.sources}>
            {sources.map((s) => (
              <li key={`${s.organization}-${s.datasetName}`} className={styles.source}>
                <p className={styles.sourceTitle}>
                  <span>{s.organization}</span>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.datasetName} ↗
                  </a>
                </p>
                {s.role && (
                  <p className={styles.sourceRole}>
                    <span className={s.role === 'primary' ? styles.rolePrimary : styles.roleCross}>
                      {s.role === 'primary' ? '主数据来源' : '交叉核验'}
                    </span>
                    {s.sourceType && (
                      <span className={styles.sourceTypeChip}>
                        {SOURCE_TYPE_LABELS[s.sourceType]}
                      </span>
                    )}
                    {s.scope && <span className={styles.sourceScope}>{s.scope}</span>}
                  </p>
                )}
                <p className={styles.sourceDesc}>{s.description}</p>
                <p className={styles.sourceMeta}>
                  访问日期 {s.accessDate} · {s.licenseOrUsageNote}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>数据状态</span>
          {data && (
            <span className={`${styles.kindChip} ${data.kind === 'demo' ? styles.kindDemo : styles.kindReal}`}>
              {data.kind === 'demo' ? 'DEMO' : 'REAL'}
            </span>
          )}
        </div>
        {data && (
          <>
            <p className={styles.caseName}>
              {data.caseInfo.chineseName}
              {data.caseInfo.typhoonNumber ? ` · ${data.caseInfo.typhoonNumber} 号` : ''}
              {data.caseInfo.year ? ` · ${data.caseInfo.year}` : ''}
              {` · ${data.caseInfo.basin}`}
            </p>
            <div className={styles.kv}>
              <span>轨迹时次</span>
              <span>{data.track.length}</span>
            </div>
            <div className={styles.kv}>
              <span>登陆点</span>
              <span>{data.landfalls.length}</span>
            </div>
            <div className={styles.kv}>
              <span>风圈</span>
              <span>{data.windRings?.features.length ?? '—'}</span>
            </div>
            <div className={styles.kv}>
              <span>风险分区</span>
              <span>{data.riskZones?.features.length ?? '—'}</span>
            </div>
            <div className={styles.kv}>
              <span>避险点</span>
              <span>{data.shelters?.features.length ?? '—'}</span>
            </div>
            <p className={styles.note}>{data.caseInfo.description}</p>
            {data.warnings.length > 0 && (
              <ul className={styles.warnList}>
                {data.warnings.map((w) => (
                  <li key={w} className={styles.warn}>
                    ⚠ {w}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {!data && loadState === 'unavailable' && <p className={styles.warn}>{notice}</p>}
        {!data && loadState === 'error' && <p className={styles.error}>{notice}</p>}
      </section>

      {data && data.kind === 'real' && (
        <section className={styles.card}>
          <p className={styles.cardTitle}>资料口径说明</p>
          <p className={styles.disclaimer}>
            本作品的历史轨迹与强度时序采用中国气象局官方历史台风数据（台风网历史台风
            API）；登陆事件信息采用中央气象台业务通报。不同资料因时次、分析流程或后分析
            订正可能存在数值差异，作品不对不同产品数值进行人为修改或强行统一。
          </p>
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>故事线</span>
          <span className={styles.pendingChip}>{chapter.index} / 06</span>
        </div>
        {chapter.nextHint ? (
          <>
            <p className={styles.storyText}>{chapter.nextHint}</p>
            <button type="button" className={styles.storyBtn} onClick={onNextChapter}>
              下一问 →
            </button>
          </>
        ) : (
          <p className={styles.storyEnding}>{STORY_ENDING}</p>
        )}
      </section>

      <p className={styles.foot}>
        DEMO 数据位于 public/data/demo/，真实数据位于 public/data/real/ 下各案例目录，两者严格物理隔离。
      </p>
    </div>
  )
}
