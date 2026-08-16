# -*- coding: utf-8 -*-
"""
prepare_population.py —— Kontur 400m H3 人口 → AOI 人口暴露 Web 展示
=====================================================================
输入：RISK_WORK/population/kontur_population_CN_20231101.gpkg.gz（ASCII 路径）
输出：RISK_WORK/out/population/{population.png, population-summary.json, manifest.json}
      与 RISK_WORK/out/grids/population.npz
说明：400m H3 六边形人口按质心归入 0.01° 网格求和（每格总人数）→ 密度（人/km²）；
      人口数值不做修改；仅表达人口暴露（exposure），不代表伤亡风险。
      背景：WorldPop 中国 100m 文件约 4.6 GB，下载受限，故改用 Kontur
      （HDX 公开数据，基于 GHSL/WorldPop 等开源输入，2023-11-01 发布版）。
"""
import gzip
import json
import os
import shutil

import numpy as np
from PIL import Image

WORK = os.environ["RISK_WORK"]
OUT = os.path.join(WORK, "out", "population")
GRIDS = os.path.join(WORK, "out", "grids")
os.makedirs(OUT, exist_ok=True)
os.makedirs(GRIDS, exist_ok=True)

AOI = [108.2, 18.9, 111.6, 21.2]
RES = 0.01
NCOL = int(round((AOI[2] - AOI[0]) / RES))
NROW = int(round((AOI[3] - AOI[1]) / RES))
DST_CRS = "EPSG:4326"

POP_HIGH = 2000.0
POP_MED = 500.0


def cmap_magma(n=256):
    anchors = np.array(
        [
            [10, 10, 40], [60, 20, 110], [130, 40, 150],
            [200, 70, 120], [250, 120, 60], [255, 200, 90],
        ],
        dtype=np.float32,
    )
    xs = np.linspace(0, 1, len(anchors))
    xn = np.linspace(0, 1, n)
    return np.stack([np.interp(xn, xs, anchors[:, i]) for i in range(3)], axis=1).astype(np.uint8)


def main():
    gz = os.path.join(WORK, "population", "kontur_population_CN_20231101.gpkg.gz")
    gpkg = gz[:-3]
    if not os.path.exists(gpkg):
        print("解压 gpkg（约 1-2 GB）…")
        with gzip.open(gz, "rb") as fin, open(gpkg, "wb") as fout:
            shutil.copyfileobj(fin, fout, length=8 * 1024 * 1024)

    import geopandas as gpd
    from pyproj import Transformer

    print("按 AOI bbox（EPSG:3857）过滤读取六边形…")
    to_3857 = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
    to_4326 = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
    wx, sy = to_3857.transform(AOI[0], AOI[1])
    ex, ny = to_3857.transform(AOI[2], AOI[3])
    gdf = gpd.read_file(gpkg, bbox=(wx, sy, ex, ny))
    print(f"AOI 内六边形: {len(gdf)}")
    pop_col = "population" if "population" in gdf.columns else gdf.columns[0]
    print(f"人口列: {pop_col}")

    # 质心归入网格（3857 → 4326）
    cx3857 = gdf.geometry.centroid.x.to_numpy()
    cy3857 = gdf.geometry.centroid.y.to_numpy()
    cx, cy = to_4326.transform(cx3857, cy3857)
    popv = gdf[pop_col].to_numpy(dtype=np.float64)
    col_idx = np.clip(((cx - AOI[0]) / RES).astype(np.int64), 0, NCOL - 1)
    row_idx = np.clip(((AOI[3] - cy) / RES).astype(np.int64), 0, NROW - 1)
    pop_total = np.zeros((NROW, NCOL), dtype=np.float64)
    np.add.at(pop_total, (row_idx, col_idx), popv)

    lats_c = np.linspace(AOI[3] - RES / 2, AOI[1] + RES / 2, NROW)
    dx_km = RES * 111.32
    dy_km = RES * 111.32 * np.cos(np.deg2rad(lats_c))
    cell_area_km2 = dx_km * dy_km
    density = pop_total / cell_area_km2[:, None]

    valid = pop_total > 0
    pop_class = np.zeros((NROW, NCOL), dtype=np.int8)
    pop_class[(valid) & (density >= POP_HIGH)] = 3
    pop_class[(valid) & (density >= POP_MED) & (density < POP_HIGH)] = 2
    pop_class[(valid) & (density < POP_MED)] = 1

    logd = np.log10(np.where(density > 0, density, np.nan))
    vmin, vmax = 1.0, 4.5
    norm = (np.clip(np.nan_to_num(logd, nan=vmin), vmin, vmax) - vmin) / (vmax - vmin)
    cmap = cmap_magma()
    rgb = cmap[np.clip((norm * 255).astype(np.int32), 0, 255)]
    rgb[~valid] = np.array([30, 34, 44], dtype=np.uint8)
    Image.fromarray(rgb).resize((NCOL * 2, NROW * 2), Image.BILINEAR).save(
        os.path.join(OUT, "population.png"), optimize=True
    )

    summary = {
        "aoi": AOI,
        "grid": {"cols": NCOL, "rows": NROW, "resolution": RES, "crs": DST_CRS},
        "source": "Kontur Population（China: Population Density for 400m H3 Hexagons, 2023-11-01 发布）via HDX",
        "sourceNote": "WorldPop 中国 100m 文件约 4.6 GB，下载受限；Kontur 数据基于 GHSL/WorldPop 等开源输入。",
        "sourceFile": os.path.basename(gz),
        "year": "2023（发布版；人口基础约 2020）",
        "resolution": "400m H3 六边形 → 质心归入 0.01° 网格",
        "unit": "人数/六边形 → 网格求和 → 人/km²",
        "population": {
            "totalInAOI": float(pop_total.sum()),
            "maxDensity": float(np.nanmax(density)) if valid.any() else None,
            "minDensity": float(np.nanmin(density[valid])) if valid.any() else None,
        },
        "classThresholds": {"high": POP_HIGH, "medium": POP_MED},
        "classCounts": {str(k): int((pop_class == k).sum()) for k in range(4)},
        "zeroPopulationCells": int((~valid).sum()),
    }
    with open(os.path.join(OUT, "population-summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    manifest = {
        "schemaVersion": 1,
        "status": "available",
        "id": "population",
        "label": "人口暴露",
        "imagePath": "real/yagi-2024/risk/population/population.png",
        "bbox": AOI,
        "legend": "深紫→紫→橙→黄 = 人口密度（对数色带，10~31623 人/km²）；深灰=无人口数据",
        "source": "Kontur Population（HDX 公开数据，基于 GHSL/WorldPop 等开源输入）",
        "sourceUrl": "https://data.humdata.org/dataset/kontur-population-china",
        "sourceType": "population",
        "year": 2023,
        "resolution": "400m H3 六边形 → 聚合至 0.01°",
        "unit": "人/km²（六边形质心归入网格求和）",
        "processing": [
            "downloaded official Kontur Population China gpkg (HDX, no login)",
            "spatially filtered to AOI 108.2-111.6E, 18.9-21.2N via bbox",
            "hexagon population assigned to 0.01-degree grid cells by centroid (SUM)",
            "converted to density (people per km2, latitude-dependent cell area)",
            "log-scaled colormap for web display",
            "no population values modified",
        ],
        "disclaimer": "人口暴露（exposure）只表示人口的空间分布，不代表伤亡风险。",
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    np.savez_compressed(
        os.path.join(GRIDS, "population.npz"),
        pop_total=pop_total.astype(np.float64),
        density=density.astype(np.float32),
        classes=pop_class,
        valid=valid.astype(np.int8),
    )

    print("===== QA: population =====")
    print(f"AOI: {AOI} | grid: {NCOL}x{NROW} @ {RES}° ({NCOL*NROW} cells) | CRS: {DST_CRS}")
    print(f"源: Kontur 400m H3 六边形 | AOI 内六边形数: {len(gdf)}")
    print(f"AOI 内总人口: {summary['population']['totalInAOI']:.0f} 人")
    print(f"密度范围: {summary['population']['minDensity']} ~ {summary['population']['maxDensity']} 人/km²")
    print(f"分级计数(0无/1低/2中/3高): {summary['classCounts']}")
    print(f"零人口像元数: {summary['zeroPopulationCells']}")
    print("输出: population.png / population-summary.json / manifest.json")


if __name__ == "__main__":
    main()
