# -*- coding: utf-8 -*-
"""
build_risk_awareness.py —— 三因子确定性“空间关注提示”综合生成
=====================================================================
输入：RISK_WORK/out/grids/{elevation,population,dist}.npz（前三个脚本产出）
输出：RISK_WORK/out/attention/{attention.png, attention-summary.json, manifest.json}
      RISK_WORK/out/grid.json（点击查询用查找网格）
      RISK_WORK/out/sources.json
规则（确定性、可审计，写入 manifest 与 aoi.json，非权重调参）：
  terrainHigh = 陆地且高程 ≤ 5 m；terrainMed = 5 < 高程 ≤ 10 m
  popHigh = 密度 ≥ 2000 人/km²；popMed = 500 ≤ 密度 < 2000
  proxHigh = 距路径 ≤ 50 km；proxMed = 50 < 距路径 ≤ 100 km
  highCount >= 2 → 重点关注；highCount == 1 或 medCount >= 2 → 较高关注；其余 → 一般关注
  海域不计地形与人口条件（只可能由邻近度触发关注）。
"""
import json
import os

import numpy as np
from PIL import Image

WORK = os.environ["RISK_WORK"]
GRIDS = os.path.join(WORK, "out", "grids")
OUT = os.path.join(WORK, "out", "attention")
os.makedirs(OUT, exist_ok=True)

AOI = [108.2, 18.9, 111.6, 21.2]
RES = 0.01
NCOL = int(round((AOI[2] - AOI[0]) / RES))
NROW = int(round((AOI[3] - AOI[1]) / RES))

ATTENTION_LABELS = {3: "重点关注", 2: "较高关注", 1: "一般关注"}
COLORS = {3: (215, 48, 39), 2: (253, 174, 97), 1: (255, 255, 191)}
SEA_COLOR = (207, 227, 242)


def main():
    elev = np.load(os.path.join(GRIDS, "elevation.npz"))
    pop = np.load(os.path.join(GRIDS, "population.npz"))
    d = np.load(os.path.join(GRIDS, "dist.npz"))

    elevation = elev["elevation"].astype(np.float32)
    land = elev["land"].astype(bool)
    density = pop["density"].astype(np.float32)
    pop_valid = pop["valid"].astype(bool)
    dist = d["dist"].astype(np.float32)

    terrain_high = land & (elevation <= 5)
    terrain_med = land & (elevation > 5) & (elevation <= 10)
    pop_high = pop_valid & (density >= 2000)
    pop_med = pop_valid & (density >= 500) & (density < 2000)
    prox_high = dist <= 50
    prox_med = (dist > 50) & (dist <= 100)

    high_count = terrain_high.astype(np.int8) + pop_high.astype(np.int8) + prox_high.astype(np.int8)
    med_count = terrain_med.astype(np.int8) + pop_med.astype(np.int8) + prox_med.astype(np.int8)

    attention = np.ones((NROW, NCOL), dtype=np.int8)   # 1 = 一般关注
    attention[high_count >= 2] = 3
    attention[(high_count == 1) | (med_count >= 2)] = 2

    rgb = np.zeros((NROW, NCOL, 3), dtype=np.uint8)
    rgb[:] = COLORS[1]
    for k, c in COLORS.items():
        rgb[attention == k] = c
    # 海域且“一般关注”（仅由邻近度决定关注等级）→ 显示为浅蓝海域
    sea_mask = ~land
    rgb[sea_mask & (attention == 1)] = SEA_COLOR

    Image.fromarray(rgb).resize((NCOL * 2, NROW * 2), Image.NEAREST).save(
        os.path.join(OUT, "attention.png"), optimize=True
    )

    counts = {ATTENTION_LABELS[k]: int((attention == k).sum()) for k in (1, 2, 3)}
    summary = {
        "aoi": AOI,
        "grid": {"cols": NCOL, "rows": NROW, "resolution": RES, "crs": "EPSG:4326"},
        "purpose": "science-communication-only",
        "disclaimer": "本结果为科普型空间分析，不属于官方灾害风险预报；实际防灾避险以官方预警为准。",
        "inputs": {
            "terrain": "Copernicus DEM GLO-30（原始数据）",
            "population": "Kontur Population 400m H3（HDX 公开数据，发布版 2023-11-01，人口基础约 2020）",
            "proximity": "NMC 台风网历史轨迹 → 最小测地距离（derived-analysis）",
        },
        "rule": [
            "terrainHigh=陆地且高程≤5m；terrainMed=5<高程≤10m",
            "popHigh=密度≥2000人/km²；popMed=500≤密度<2000",
            "proxHigh=距路径≤50km；proxMed=50<距路径≤100km",
            "highCount≥2 → 重点关注",
            "highCount==1 或 medCount≥2 → 较高关注",
            "其余 → 一般关注",
            "海域不计地形与人口条件",
        ],
        "classCounts": counts,
    }
    with open(os.path.join(OUT, "attention-summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    manifest = {
        "schemaVersion": 1,
        "status": "available",
        "id": "attention",
        "label": "空间关注提示",
        "imagePath": "real/yagi-2024/risk/attention/attention.png",
        "bbox": AOI,
        "legend": "红=重点关注｜橙=较高关注｜黄=一般关注｜浅蓝=海域",
        "source": "derived from Copernicus DEM + Kontur Population + NMC track（确定性规则）",
        "sourceUrl": "real/yagi-2024/risk/aoi.json",
        "sourceType": "derived-analysis",
        "purpose": "science-communication-only",
        "processing": [
            "inputs: terrain classes (Copernicus DEM), population density classes (Kontur Population 400m), track proximity classes (NMC track)",
            "deterministic rule as documented in attention-summary.json and aoi.json",
            "no weights tuned to match visual expectations",
        ],
        "disclaimer": "本结果为科普型空间分析，不属于官方灾害风险预报；实际防灾避险以气象/应急部门官方预警为准。",
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # 点击查询网格（前端 lookup）
    lats = np.linspace(AOI[3] - RES / 2, AOI[1] + RES / 2, NROW)
    lons = np.linspace(AOI[0] + RES / 2, AOI[2] - RES / 2, NCOL)
    grid = {
        "meta": {
            "bbox": AOI,
            "resolution": RES,
            "rows": NROW,
            "cols": NCOL,
            "disclaimer": summary["disclaimer"],
        },
        "lats": [round(float(x), 4) for x in lats],
        "lons": [round(float(x), 4) for x in lons],
        "elevation": [round(float(x), 1) if np.isfinite(x) else None for x in elevation.ravel()],
        "popDensity": [round(float(x), 1) for x in density.ravel()],
        "distKm": [round(float(x), 2) for x in dist.ravel()],
        "land": land.astype(np.int8).ravel().tolist(),
        "attention": attention.ravel().tolist(),
    }
    # 用更紧凑的类数组代替逐布尔数组
    tclass = np.zeros((NROW, NCOL), dtype=np.int8)
    tclass[terrain_high] = 3
    tclass[(~terrain_high) & terrain_med] = 2
    tclass[land & (~terrain_high) & (~terrain_med)] = 1
    pclass = np.zeros((NROW, NCOL), dtype=np.int8)
    pclass[pop_high] = 3
    pclass[(~pop_high) & pop_med] = 2
    pclass[pop_valid & (~pop_high) & (~pop_med)] = 1
    xclass = np.zeros((NROW, NCOL), dtype=np.int8)
    xclass[prox_high] = 3
    xclass[(~prox_high) & prox_med] = 2
    xclass[(~prox_high) & (~prox_med) & (dist <= 150)] = 1
    grid["terrainClass"] = tclass.ravel().tolist()
    grid["popClass"] = pclass.ravel().tolist()
    grid["proxClass"] = xclass.ravel().tolist()
    with open(os.path.join(WORK, "out", "grid.json"), "w", encoding="utf-8") as f:
        json.dump(grid, f, ensure_ascii=False, separators=(",", ":"))

    # 风险数据来源
    sources = [
        {
            "organization": "Copernicus（欧洲空间局 / 欧盟）",
            "datasetName": "Copernicus DEM GLO-30（30 m 全球数字高程模型）",
            "url": "https://registry.opendata.aws/copernicus-dem/",
            "accessDate": "2026-08-16",
            "description": "地形/低海拔因子（原始数据，高程未修改）；4 个纯海域边缘瓦片不存在，海域按 NoData 处理。",
            "licenseOrUsageNote": "Copernicus 开放许可，注明来源",
            "role": "primary",
            "scope": "地形因子（terrain）",
            "sourceType": "terrain",
        },
        {
            "organization": "Kontur（via HDX，Humanitarian Data Exchange）",
            "datasetName": "China: Population Density for 400m H3 Hexagons（2023-11-01 发布版，人口基础约 2020）",
            "url": "https://data.humdata.org/dataset/kontur-population-china",
            "accessDate": "2026-08-16",
            "description": "人口暴露因子（原始数据）；400m 六边形人口按质心归入 0.01° 网格求和为人数，再换算密度（人/km²），数值未修改。（注：最初计划使用 WorldPop 中国 100m，因其完整文件约 4.6 GB 下载受限，故改用 Kontur 公开数据。）",
            "licenseOrUsageNote": "CC BY（Kontur / HDX），注明来源",
            "role": "primary",
            "scope": "人口暴露因子（population）",
            "sourceType": "population",
        },
        {
            "organization": "中国气象局台风网（NMC）",
            "datasetName": "YAGI 历史轨迹（36 点）",
            "url": "http://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_3275487",
            "accessDate": "2026-08-15",
            "description": "路径邻近度因子的输入（derived-analysis：最小测地距离，方法见 proximity-summary.json）。",
            "licenseOrUsageNote": "中国气象局官方数据，注明来源",
            "role": "primary",
            "scope": "路径邻近度（proximity）输入",
            "sourceType": "derived-analysis",
        },
    ]
    with open(os.path.join(WORK, "out", "sources.json"), "w", encoding="utf-8") as f:
        json.dump({"sources": sources}, f, ensure_ascii=False, indent=2)

    print("===== QA: attention =====")
    print(f"AOI: {AOI} | grid: {NCOL}x{NROW} @ {RES}° | CRS: EPSG:4326")
    print(f"综合提示计数: {counts}")
    print("规则: " + " | ".join(summary["rule"]))
    print("输出: attention.png / attention-summary.json / manifest.json / grid.json / sources.json")


if __name__ == "__main__":
    main()
