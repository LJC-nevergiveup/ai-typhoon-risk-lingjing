# public/data/raw/cma —— CMA 原始数据（只读）

## 用途

本目录存放 CMA 热带气旋最佳路径数据集的**原始文本文件**，
由 `scripts/import-cma-best-track.ts` 解析后生成规范 GeoJSON（`public/data/real/<案例>/`）。

## 需要的文件

```
public/data/raw/cma/CH2024BST.txt
```

- 文件名：`CH2024BST.txt`（2024 年最佳路径数据）
- 来源：中国气象局上海台风研究所 tcdata.typhoon.org.cn
  （网站：数据下载 → 最佳路径数据 → CMA 热带气旋最佳路径数据集 → CH2024BST.txt）

## 铁律

1. **原始文件只读**：禁止以任何形式修改原始文件内容；
   如需修正数据，必须在导入脚本或生成结果层面记录，并保留原始字段（cmaRecord 等）。
2. 原始文件不入库（.gitignore 已排除 `public/data/raw/**/*.txt`）。
3. 数据使用请遵守 CMA 数据集的许可说明（科研与教育用途，注明来源）。

## 导入命令

```bash
npm run import:cma                        # 解析并生成 track.geojson（QA 全部通过才写盘）
npm run import:cma -- --self-test         # 用内置合成样本自检解析器
npm run import:cma -- --update-manifest   # QA 通过后同步启用 REAL 案例（manifest status=available）
```

> 当前状态（2026-08-15 检查）：`CH2024BST.txt` **缺失**。请先按上述来源取得文件并放入本目录，
> 然后运行导入命令。在此之前，yagi-2024 案例保持 `awaiting-authoritative-data`，前端不会用任何数据冒充真实轨迹。
