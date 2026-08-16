# -*- coding: utf-8 -*-
"""
prepare_terrain.py —— Copernicus DEM GLO-30 → AOI 高程分级 Web 展示
=====================================================================
输入：RISK_WORK/dem/*.tif（GLO-30 1°×1° COG 瓦片，ASCII 路径）
输出：RISK_WORK/out/terrain/{terrain-lowland.png, terrain-summary.json, manifest.json}
      与 RISK_WORK/out/grids/elevation.npz（供后续综合脚本使用）
说明：海洋（无数据）不参与高程分级，标注为海域；原始高程值未修改。
"""
import glob
import json
import math
import os

import numpy as np
import rasterio
from rasterio.warp import Resampling, reproject
from PIL import Image

WORK = os.environ["RISK_WORK"]
OUT = os.path.join(WORK, "out", "terrain")
GRIDS = os.path.join(WORK, "out", "grids")
os.makedirs(OUT, exist_ok=True)
os.makedirs(GRIDS, exist_ok=True)

AOI = [108.2, 18.9, 111.6, 21.2]   # west, south, east, north
RES = 0.01
NCOL = int(round((AOI[2] - AOI[0]) / RES))   # 340
NROW = int(round((AOI[3] - AOI[1]) / RES))   # 230

BANDS = [(0.0, 5.0), (5.0, 10.0), (10.0, 30.0), (30.0, None)]
BAND_LABELS = ["0–5 m（低洼）", "5–10 m", "10–30 m", "> 30 m"]
# 色带：低洼红 → 橙 → 浅黄 → 绿；海域浅蓝
BAND_COLORS = [(215, 48, 39), (253, 174, 97), (254, 224, 144), (166, 217, 106)]
SEA_COLOR = (207, 227, 242)

DST_CRS = "EPSG:4326"
NODATA = -9999.0


def main():
    tiles = sorted(glob.glob(os.path.join(WORK, "dem", "*.tif")))
    print("DEM 瓦片数:", len(tiles))
    if not tiles:
        raise RuntimeError("工作目录缺少 DEM 瓦片")

    elevation = np.full((NROW, NCOL), np.nan, dtype=np.float32)
    src_crs = None
    src_res = None
    used = []
    for t in tiles:
        try:
            with rasterio.open(t) as src:
                if src_crs is None:
                    src_crs = src.crs.to_string()
                    src_res = src.res
                # 重投影到目标网格
                dst = np.full((NROW, NCOL), np.nan, dtype=np.float32)
                reproject(
                    source=rasterio.band(src, 1),
                    destination=dst,
                    src_transform=src.transform,
                    src_crs=src.crs,
                    src_nodata=src.nodata if src.nodata is not None else NODATA,
                    dst_transform=rasterio.transform.from_bounds(AOI[0], AOI[1], AOI[2], AOI[3], NCOL, NROW),
                    dst_crs=DST_CRS,
                    dst_nodata=np.nan,
                    resampling=Resampling.bilinear,
                )
                mask = np.isnan(elevation)
                elevation[mask] = dst[mask]
                used.append(os.path.basename(t))
        except Exception as e:
            print(f"  跳过损坏瓦片 {os.path.basename(t)}: {e}")

    # 陆地掩膜：Natural Earth 110m 海岸线（GLO-30 沿岸瓦片含海面 0 值，需以海岸线区分）
    land = None
    shp = os.path.join(WORK, "landmask", "ne_110m_land.shp")
    if os.path.exists(shp):
        import geopandas as gpd
        from shapely.geometry import box, Point
        from shapely.prepared import prep

        gdf = gpd.read_file(shp)
        prepared = prep(gdf.unary_union)
        lons = np.linspace(AOI[0] + RES / 2, AOI[2] - RES / 2, NCOL)
        lats = np.linspace(AOI[3] - RES / 2, AOI[1] + RES / 2, NROW)
        land = np.zeros((NROW, NCOL), dtype=bool)
        ys, xs = np.mgrid[0:NROW, 0:NCOL]
        pts = [Point(lons[x], lats[y]) for y, x in zip(ys.ravel(), xs.ravel())]
        hits = [prepared.contains(p) or prepared.intersects(p.buffer(0.0001)) for p in pts]
        land = np.array(hits, dtype=bool).reshape(NROW, NCOL)
        print(f"海岸线掩膜: 陆地像元 {int(land.sum())} / {NROW*NCOL}")
    else:
        print("警告：未找到 Natural Earth 海岸线，使用 有限高程值 作为陆地近似")
        land = np.isfinite(elevation)

    land = land & np.isfinite(elevation)
    nodata_count = int((~land).sum())

    # 高程分级（仅陆地）
    classes = np.full((NROW, NCOL), 4, dtype=np.int8)   # 4 = 海域
    for i, (lo, hi) in enumerate(BANDS):
        if hi is None:
            classes[(land) & (elevation >= lo)] = i
        else:
            classes[(land) & (elevation >= lo) & (elevation < hi)] = i

    # PNG
    rgb = np.zeros((NROW, NCOL, 3), dtype=np.uint8)
    rgb[:] = SEA_COLOR
    for i, c in enumerate(BAND_COLORS):
        rgb[classes == i] = c
    Image.fromarray(rgb).resize((NCOL * 2, NROW * 2), Image.NEAREST).save(
        os.path.join(OUT, "terrain-lowland.png"), optimize=True
    )

    band_counts = {BAND_LABELS[i]: int((classes == i).sum()) for i in range(4)}
    summary = {
        "aoi": AOI,
        "grid": {"cols": NCOL, "rows": NROW, "resolution": RES, "crs": DST_CRS},
        "source": "Copernicus DEM GLO-30 (AWS Open Data)",
        "landMask": "Natural Earth 110m land polygons（海岸线掩膜，区分海面 0 值与陆地）",
        "sourceFiles": used,
        "elevation": {
            "min": float(np.nanmin(elevation)) if land.any() else None,
            "max": float(np.nanmax(elevation)) if land.any() else None,
            "mean": float(np.nanmean(elevation)) if land.any() else None,
        },
        "bandCounts": band_counts,
        "seaCellCount": nodata_count,
        "noDataCount": nodata_count,
        "note": "4 个纯海域边缘瓦片在 AWS 桶中不存在（GLO-30 不含海洋瓦片），按 NoData（海域）处理；海洋不参与高程分级。",
    }
    with open(os.path.join(OUT, "terrain-summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    manifest = {
        "schemaVersion": 1,
        "status": "available",
        "id": "terrain",
        "label": "地形（低海拔分级）",
        "imagePath": "real/yagi-2024/risk/terrain/terrain-lowland.png",
        "bbox": AOI,
        "legend": "红=0–5 m（低洼）｜橙=5–10 m｜黄=10–30 m｜绿=>30 m｜浅蓝=海域（无高程数据）",
        "source": "Copernicus DEM GLO-30",
        "sourceUrl": "https://registry.opendata.aws/copernicus-dem/",
        "sourceType": "terrain",
        "year": 2022,
        "resolution": "30 m（重采样至 0.01°）",
        "unit": "m",
        "processing": [
            "downloaded Copernicus DEM GLO-30 1-degree COG tiles (AWS Open Data, no login)",
            "merged 13 tiles over AOI 108.2-111.6E, 18.9-21.2N",
            "land/sea mask from Natural Earth 110m coastline (GLO-30 coastal tiles contain 0-m sea values)",
            "resampled to 0.01-degree grid (bilinear)",
            "classified elevation bands 0-5/5-10/10-30/>30 m (land only)",
            "rendered to PNG for web display",
            "no elevation values modified",
        ],
        "disclaimer": "低海拔不代表一定会被淹没；本图层仅提示地形关注程度。",
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    np.savez_compressed(
        os.path.join(GRIDS, "elevation.npz"),
        elevation=elevation.astype(np.float32),
        land=land.astype(np.int8),
        classes=classes,
    )

    print("===== QA: terrain =====")
    print(f"AOI: {AOI}")
    print(f"grid: {NCOL}x{NROW} @ {RES}° ({NCOL*NROW} cells), CRS: {DST_CRS}")
    print(f"瓦片: {len(used)} 个 | 源 CRS: {src_crs} | 源分辨率: {src_res}")
    print(f"高程 min/max/mean: {summary['elevation']['min']}/{summary['elevation']['max']}/{summary['elevation']['mean']} m")
    print(f"分级计数: {band_counts}")
    print(f"NoData(海域) 像元数: {nodata_count}")
    print("输出: terrain-lowland.png / terrain-summary.json / manifest.json")


if __name__ == "__main__":
    main()
