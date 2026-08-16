# -*- coding: utf-8 -*-
"""
compute_track_proximity.py —— AOI 网格到 YAGI 真实轨迹的最小测地距离
=====================================================================
输入：RISK_WORK/track.geojson（NMC 台风网历史轨迹，36 点，只读）
输出：RISK_WORK/out/proximity/{proximity.png, proximity-summary.json, manifest.json}
      与 RISK_WORK/out/grids/dist.npz
方法：WGS84 球面（R=6371.0088 km）交叉航迹公式，逐段取最小值（端点裁剪）；
      名称统一为“台风路径邻近度”，不表示风圈/风速/破坏范围。
"""
import json
import os

import numpy as np
from PIL import Image

WORK = os.environ["RISK_WORK"]
OUT = os.path.join(WORK, "out", "proximity")
GRIDS = os.path.join(WORK, "out", "grids")
os.makedirs(OUT, exist_ok=True)
os.makedirs(GRIDS, exist_ok=True)

AOI = [108.2, 18.9, 111.6, 21.2]
RES = 0.01
NCOL = int(round((AOI[2] - AOI[0]) / RES))
NROW = int(round((AOI[3] - AOI[1]) / RES))
R = 6371.0088   # km, WGS84 平均半径

PROX_HIGH = 50.0
PROX_MED = 100.0
PROX_LOW = 150.0


def main():
    track_path = os.path.join(WORK, "track.geojson")
    with open(track_path, "r", encoding="utf-8") as f:
        fc = json.load(f)
    pts = [
        (f["geometry"]["coordinates"][0], f["geometry"]["coordinates"][1])
        for f in fc["features"]
    ]
    print(f"轨迹点数: {len(pts)} | 来源: {fc.get('generatedBy', 'track.geojson')}")

    lons = np.linspace(AOI[0] + RES / 2, AOI[2] - RES / 2, NCOL)
    lats = np.linspace(AOI[3] - RES / 2, AOI[1] + RES / 2, NROW)
    lon2d, lat2d = np.meshgrid(lons, lats)
    lat_r = np.deg2rad(lat2d)
    lon_r = np.deg2rad(lon2d)

    dist = np.full((NROW, NCOL), np.inf, dtype=np.float32)
    for a, b in zip(pts[:-1], pts[1:]):
        lat1, lon1 = np.deg2rad(a[1]), np.deg2rad(a[0])
        lat2, lon2 = np.deg2rad(b[1]), np.deg2rad(b[0])
        # 大圆距离与方位
        dlon = lon2 - lon1
        y = np.sin(dlon) * np.cos(lat2)
        x = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon)
        d12 = np.arctan2(np.hypot(y, x), np.sin(lat1) * np.sin(lat2) + np.cos(lat1) * np.cos(lat2) * np.cos(dlon))
        brng12 = np.arctan2(np.sin(dlon) * np.cos(lat2),
                            np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dlon))
        # 点→段起点
        dlon3 = lon_r - lon1
        y3 = np.sin(dlon3) * np.cos(lat_r)
        x3 = np.cos(lat1) * np.sin(lat_r) - np.sin(lat1) * np.cos(lat_r) * np.cos(dlon3)
        d13 = np.arctan2(np.hypot(y3, x3), np.sin(lat1) * np.sin(lat_r) + np.cos(lat1) * np.cos(lat_r) * np.cos(dlon3))
        brng13 = np.arctan2(np.sin(dlon3) * np.cos(lat_r),
                            np.cos(lat1) * np.sin(lat_r) - np.sin(lat1) * np.cos(lat_r) * np.cos(dlon3))
        # 交叉航迹角距离
        dxt = np.arcsin(np.sin(d13) * np.sin(brng13 - brng12))
        # 沿航迹角距离
        dat = np.arccos(np.clip(np.cos(d13) / np.clip(np.cos(dxt), 1e-12, 1), -1, 1))
        # 投影点在段内 → 交叉航迹距离；在段外 → 暂取到段起点距离（随后裁剪到端点）
        seg_dist = np.where(dat <= d12, np.abs(dxt), d13)
        outside = dat > d12
        if outside.any():
            dlon4 = lon_r - lon2
            y4 = np.sin(dlon4) * np.cos(lat_r)
            x4 = np.cos(lat2) * np.sin(lat_r) - np.sin(lat2) * np.cos(lat_r) * np.cos(dlon4)
            d23 = np.arctan2(np.hypot(y4, x4), np.sin(lat2) * np.sin(lat_r) + np.cos(lat2) * np.cos(lat_r) * np.cos(dlon4))
            seg_dist = np.where(outside, np.minimum(d13, d23), seg_dist)
        seg_dist = np.abs(seg_dist) * R
        dist = np.minimum(dist, seg_dist)

    # 分级
    prox_class = np.zeros((NROW, NCOL), dtype=np.int8)
    prox_class[dist <= PROX_HIGH] = 3
    prox_class[(dist > PROX_HIGH) & (dist <= PROX_MED)] = 2
    prox_class[(dist > PROX_MED) & (dist <= PROX_LOW)] = 1
    # 0 = >150 km

    colors = {
        3: (215, 48, 39),   # ≤50 km
        2: (253, 174, 97),  # 50-100
        1: (254, 224, 144), # 100-150
        0: (235, 244, 232), # >150
    }
    rgb = np.zeros((NROW, NCOL, 3), dtype=np.uint8)
    for k, c in colors.items():
        rgb[prox_class == k] = c
    Image.fromarray(rgb).resize((NCOL * 2, NROW * 2), Image.NEAREST).save(
        os.path.join(OUT, "proximity.png"), optimize=True
    )

    summary = {
        "aoi": AOI,
        "grid": {"cols": NCOL, "rows": NROW, "resolution": RES, "crs": "EPSG:4326"},
        "input": "NMC 台风网历史轨迹 track.geojson（36 点，未修改）",
        "method": "WGS84 球面（R=6371.0088 km）大圆交叉航迹距离，逐段取最小值，端点自动裁剪；名称=台风路径邻近度",
        "distance": {
            "min": float(np.min(dist)),
            "max": float(np.max(dist)),
            "mean": float(np.mean(dist)),
        },
        "classThresholdsKm": {"high": PROX_HIGH, "medium": PROX_MED, "low": PROX_LOW},
        "classCounts": {str(k): int((prox_class == k).sum()) for k in range(4)},
        "note": "路径邻近度 ≠ 风圈、风速影响范围或台风破坏范围；不使用缺失的风圈数据。",
    }
    with open(os.path.join(OUT, "proximity-summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    manifest = {
        "schemaVersion": 1,
        "status": "available",
        "id": "proximity",
        "label": "台风路径邻近度",
        "imagePath": "real/yagi-2024/risk/proximity/proximity.png",
        "bbox": AOI,
        "legend": "红=距路径 ≤50 km｜橙=50–100 km｜黄=100–150 km｜浅绿=>150 km",
        "source": "derived from NMC 台风网历史轨迹（track.geojson）",
        "sourceUrl": "http://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_3275487",
        "sourceType": "derived-analysis",
        "purpose": "science-communication-only",
        "processing": [
            "input = NMC historical track (36 points, unmodified)",
            "method = minimum cross-track distance on WGS84 sphere (R=6371.0088 km), per-segment with endpoint clamping",
            "grid = 0.01-degree AOI cells",
            "distance values not manually modified",
        ],
        "disclaimer": "路径邻近度仅表示与历史轨迹的几何距离，不代表风速、风圈或破坏范围。",
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    np.savez_compressed(os.path.join(GRIDS, "dist.npz"), dist=dist.astype(np.float32), classes=prox_class)

    print("===== QA: proximity =====")
    print(f"AOI: {AOI} | grid: {NCOL}x{NROW} @ {RES}° ({NCOL*NROW} cells) | CRS: EPSG:4326")
    print(f"输入轨迹: {len(pts)} 点")
    print(f"距离 min/mean/max: {summary['distance']['min']:.2f} / {summary['distance']['mean']:.2f} / {summary['distance']['max']:.2f} km")
    print(f"分级计数(0>150km/1低/2中/3高): {summary['classCounts']}")
    print("输出: proximity.png / proximity-summary.json / manifest.json")


if __name__ == "__main__":
    main()
