# public/data/raw/nmc —— 中国气象局台风网原始数据（只读）

## 用途

存放中国气象局台风网（typhoon.nmc.cn）官方历史台风 API 的**原始 JSONP 响应**，
由 `scripts/import-nmc-track.ts` 解析后生成 `public/data/real/yagi-2024/track.geojson`。

## 文件

```
public/data/raw/nmc/yagi-2024-view.json   # YAGI（2411）完整历史路径原始响应
```

- 获取命令（记录备案）：
  `http://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_3275487`
  （3275487 为 YAGI 在台风网中的台风 id）
- 保存于 2026-08-15；数据为台风网“历史台风”页面同源的最佳路径分析数据。

## 背景说明

CMA 最佳路径原始文件 `CH2024BST.txt`（tcdata.typhoon.org.cn，CMA-STI）站点部署了
SafeLine WAF（JS 挑战），当前无法程序化下载，因此本案例轨迹暂用同一机构（中国气象局）
台风网官方历史台风数据；两者同属 CMA 官方分析数据谱系。
待取得 CH2024BST.txt 后，用 `scripts/import-cma-best-track.ts` 与本数据交叉核验。

## 铁律

1. **原始文件只读**，禁止修改。
2. 数据使用请遵守中国气象局数据使用要求（科研与教育用途，注明来源）。
