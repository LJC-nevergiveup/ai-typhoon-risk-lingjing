# -*- coding: utf-8 -*-
"""
NOAA CRW CoralTemp SST 本地渲染脚本
====================================
输入：%TEMP%\crw_2024-09-01.csv（完整 0.05° 网格）、%TEMP%\crw_2024-09-05.csv（0.1° 网格）
输出：FY4B_WORK/out/sst/imagery/noaa-crw-sst-*.png 与 out/sst_manifest.json
原则：数值不做任何修改；本地仅做网格整理、色带映射与格式导出，处理步骤如实记录。
"""
import csv
import json
import math
import os

import numpy as np
from PIL import Image

WORK = os.environ["FY4B_WORK"]
OUT = os.path.join(WORK, "out", "sst", "imagery")
os.makedirs(OUT, exist_ok=True)
TMP = os.environ.get("TEMP", ".")

REGION = [105.0, 5.0, 140.0, 30.0]   # west, south, east, north
OUT_W, OUT_H = 1400, 1000


def read_grid(path):
    """读取 ERDDAP CSV → (lats_desc, lons_asc, values) 数组。"""
    lats = []
    lons = []
    vals = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # 列名
        next(reader)  # 单位
        for row in reader:
            lat = float(row[1])
            lon = float(row[2])
            v = row[3].strip()
            lats.append(lat)
            lons.append(lon)
            vals.append(np.nan if v in ("", "NaN", "nan") else float(v))
    lats = np.array(lats)
    lons = np.array(lons)
    vals = np.array(vals)
    ulats = np.unique(lats)
    ulons = np.unique(lons)
    nlat, nlon = len(ulats), len(ulons)
    grid = vals.reshape(nlat, nlon)   # 行=纬度升序（5→30），列=经度升序
    # 翻转为 上北下南
    return ulats[::-1], ulons, grid[::-1, :]


def cmap_blue_red(n=256):
    anchors = np.array(
        [
            [10, 30, 90], [0, 130, 200], [0, 200, 160],
            [120, 220, 60], [255, 200, 40], [255, 90, 30], [200, 10, 20],
        ],
        dtype=np.float32,
    )
    xs = np.linspace(0, 1, len(anchors))
    xn = np.linspace(0, 1, n)
    return np.stack([np.interp(xn, xs, anchors[:, i]) for i in range(3)], axis=1).astype(np.uint8)


def render(grid, vmin, vmax):
    norm = (np.clip(grid, vmin, vmax) - vmin) / max(vmax - vmin, 1e-6)
    idx = np.clip((np.nan_to_num(norm, nan=0.0) * 255).astype(np.int32), 0, 255)
    cmap = cmap_blue_red()
    rgb = cmap[idx]
    rgb[~np.isfinite(grid)] = np.array([70, 70, 70], dtype=np.uint8)
    return Image.fromarray(rgb)


def main():
    frames = []
    for date, path, res in [
        ("2024-09-01", os.path.join(TMP, "crw_2024-09-01.csv"), "0.05°"),
        ("2024-09-05", os.path.join(TMP, "crw_2024-09-05.csv"), "0.1°"),
    ]:
        lats, lons, grid = read_grid(path)
        finite = grid[np.isfinite(grid)]
        vmin = float(math.floor(np.nanmin(grid) * 10) / 10)
        vmax = float(math.ceil(np.nanmax(grid) * 10) / 10)
        valid_frac = np.isfinite(grid).mean() * 100
        print(
            f"{date}: 网格 {grid.shape} ({res}) 有效占比 {valid_frac:.1f}% "
            f"min={np.nanmin(grid):.2f} max={np.nanmax(grid):.2f} mean={finite.mean():.2f} °C"
        )
        img = render(grid, vmin, vmax)
        out_id = "noaa-crw-sst-" + date.replace("-", "")
        out_png = os.path.join(OUT, f"{out_id}.png")
        # 缩放到统一展示尺寸（双线性）
        img = img.resize((OUT_W, OUT_H), Image.BILINEAR)
        img.save(out_png, optimize=True)
        frames.append(
            {
                "id": out_id,
                "date": date,
                "satellite": "多源卫星融合（NOAA-20 VIIRS 等）",
                "instrument": "CoralTemp（5km 全球日分析）",
                "product": "NOAA Coral Reef Watch Daily Global 5km Satellite SST (CoralTemp)",
                "imagePath": f"real/yagi-2024/environment/sst/imagery/{out_id}.png",
                "bbox": REGION,
                "unit": "°C",
                "valueRange": [vmin, vmax],
                "source": "NOAA Coral Reef Watch / NOAA CoastWatch ERDDAP",
                "sourceUrl": "https://coastwatch.noaa.gov/erddap/griddap/noaacrwsstDaily.html",
                "sourceType": "ocean-observation",
                "processing": [
                    "downloaded official data (CSV) via NOAA CoastWatch ERDDAP",
                    "gridded to equirectangular 105-140E, 5-30N (values unmodified)",
                    "color-mapped locally: custom blue-red palette over valueRange (degC)",
                    "land / missing pixels rendered gray",
                    "saved as PNG (web format)",
                ],
                "legend": f"蓝→红渐变色带（{vmin}–{vmax} °C）；灰色=陆地/无数据",
            }
        )
        print(f"  -> {out_png}")

    manifest = {
        "schemaVersion": 1,
        "status": "available",
        "note": (
            "由 scripts/import_crw_sst.py 生成：NOAA Coral Reef Watch 官方日 SST 分析场（CoralTemp，°C），"
            "数值未修改。FY-4B AGRI SST 官方产品（用户自风云数据服务网下载，存于 raw/nsmc）在该时次区域内"
            "高质量像元仅约 1%（台风云系覆盖），其有效像元均值（09-01 约 28.8°C / 09-05 约 28.4°C，仅极少量晴空像元，"
            "受采样影响）与本分析场（约 30°C）量级一致、同为暖水背景；展示图层使用完整分析场以保证海温空间分布可读。"
        ),
        "frames": frames,
    }
    with open(os.path.join(WORK, "out", "sst_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print("sst_manifest.json 已生成")


if __name__ == "__main__":
    main()
