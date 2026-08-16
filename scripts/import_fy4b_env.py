# -*- coding: utf-8 -*-
"""
FY-4B AGRI 环境观测资料处理脚本（重投影 + 渲染 + 生成 manifest）
================================================================
输入：FY4B_WORK 目录（ASCII 路径，由 PowerShell 从 raw/nsmc 复制而来）
  - FY4B-_AGRI--_N_DISK_1050E_L2-_GCLR_MULT_NOM_*_1000M_V0001.JPG （真彩，6 帧）
  - FY4B-_AGRI--_N_DISK_1050E_L2-_SST-_MULT_NOM_*_4000M_V0001.NC   （SST，2 日）
输出：FY4B_WORK/out/
  - satellite/imagery/*.png + satellite_manifest.json
  - sst/imagery/*.png + sst_manifest.json
原理：
  - FY-4B L2 产品位于标称网格（NOM）：nominal subpoint lon=105E、height=35786km（来自 NC 属性）
  - 网格角度采样由 GCLR 图像中的地球圆盘边缘实测定标（地球半张角 8.696°）
  - 标准静止卫星前向投影（WGS84/GRS80）把目标经纬度映射到扫描角→像素，双线性重采样到等经纬度
处理说明如实写入各帧 processing；SST 数值不做任何修改。
"""
import json
import math
import os
import re
import glob

import numpy as np
from PIL import Image
from scipy.ndimage import map_coordinates

WORK = os.environ["FY4B_WORK"]
OUT = os.path.join(WORK, "out")
SAT_DIR = os.path.join(OUT, "satellite", "imagery")
SST_DIR = os.path.join(OUT, "sst", "imagery")
for d in (SAT_DIR, SST_DIR):
    os.makedirs(d, exist_ok=True)

LON0 = 105.0
REQ = 6378.137          # km, GRS80
RPOL = 6356.7523        # km
H = 42164.137           # km（6378.137 + 35786）
HALF_DEG = math.degrees(math.asin(REQ / H))   # 地球圆盘半张角 ≈ 8.696°

REGION = [105.0, 5.0, 140.0, 30.0]   # west, south, east, north
OUT_W, OUT_H = 1400, 1000

ORG = "国家卫星气象中心（NSMC/CMA）风云卫星遥感数据服务网"
URL_MAIN = "https://satellite.nsmc.org.cn/"

SAT_PRODUCT = "AGRI 真彩图像（GCLR）L2 · 全圆盘 1000M"
SST_PRODUCT = "AGRI 海表温度（SST）L2 · 全圆盘 4KM"

SST_PROC = [
    "downloaded official image product (NSMC DataPortal, NetCDF)",
    "reprojected from FY-4B fixed grid (nominal subpoint 105E) to EPSG:4326 equirectangular, bilinear resampling",
    "only high-quality pixels shown (DQF<=1); cloud/invalid/land pixels left gray, no interpolation",
    "cropped to 105-140E, 5-30N for web visualization",
    "color-mapped: custom blue-red palette over valueRange (degC)",
    "saved as PNG (web format)",
    "SST values from official L2 product, not modified",
]
SAT_PROC_BASE = [
    "downloaded official image product (NSMC DataPortal, JPG)",
    "reprojected from FY-4B fixed grid (nominal subpoint 105E) to EPSG:4326 equirectangular, bilinear resampling",
    "cropped to 105-140E, 5-30N for web visualization",
    "saved as PNG (web format)",
    "no meteorological values modified",
]


def scan_angles(lat, lon):
    """标准静止卫星前向投影：经纬度 → (x扫描角rad, y扫描角rad)。"""
    la = np.deg2rad(lat)
    lo = np.deg2rad(np.asarray(lon) - LON0)
    phic = np.arctan((RPOL ** 2 / REQ ** 2) * np.tan(la))
    rc = RPOL / np.sqrt(1 - (REQ ** 2 - RPOL ** 2) / REQ ** 2 * np.cos(phic) ** 2)
    sx = H - rc * np.cos(phic) * np.cos(lo)
    sy = -rc * np.cos(phic) * np.sin(lo)
    sz = rc * np.sin(phic)
    s = np.sqrt(sx ** 2 + sy ** 2 + sz ** 2)
    x = np.arctan2(-sy, sx)
    y = np.arcsin(sz / s)
    return x, y


def measure_limb_radius(gray, cy, cx, thresh=8):
    """沿中心行/列找地球圆盘边缘（空间背景近似纯黑），返回平均半径 px。"""
    row = gray[cy, :].astype(np.int16)
    col = gray[:, cx].astype(np.int16)

    def edges(line):
        idx = np.where(line > thresh)[0]
        if len(idx) == 0:
            return None
        return int(idx[0]), int(idx[-1])

    e1 = edges(row)
    e2 = edges(col)
    if e1 is None or e2 is None:
        raise RuntimeError("无法在图像中找到地球圆盘边缘")
    r1 = (cx - e1[0] + e1[1] - cx) / 2.0
    r2 = (cy - e2[0] + e2[1] - cy) / 2.0
    return (r1 + r2) / 2.0


def build_region_grid():
    lons = np.linspace(REGION[0], REGION[2], OUT_W)
    lats = np.linspace(REGION[3], REGION[1], OUT_H)   # 上北下南
    lon2d, lat2d = np.meshgrid(lons, lats)
    return lat2d, lon2d


def sample_rgb(img_arr, lat2d, lon2d, scale_rad_per_px, cy, cx):
    """img_arr: (H,W,3) uint8；双线性重采样到目标网格。东→左（标准 GEO 视角）。"""
    x_rad, y_rad = scan_angles(lat2d, lon2d)
    c = cx - x_rad / scale_rad_per_px
    l = cy - y_rad / scale_rad_per_px
    out = np.empty((OUT_H, OUT_W, 3), dtype=np.float32)
    for b in range(3):
        out[:, :, b] = map_coordinates(
            img_arr[:, :, b].astype(np.float32), [l, c], order=1, mode="constant", cval=0.0
        )
    return np.clip(out, 0, 255).astype(np.uint8)


def sample_scalar(arr, lat2d, lon2d, scale_rad_per_px, cy, cx, cval=np.nan):
    x_rad, y_rad = scan_angles(lat2d, lon2d)
    c = cx - x_rad / scale_rad_per_px
    l = cy - y_rad / scale_rad_per_px
    return map_coordinates(arr, [l, c], order=1, mode="constant", cval=cval, prefilter=False)


def cmap_blue_red(n=256):
    anchors = np.array(
        [
            [10, 30, 90],      # 深蓝（冷）
            [0, 130, 200],     # 蓝
            [0, 200, 160],     # 青
            [120, 220, 60],    # 黄绿
            [255, 200, 40],    # 黄
            [255, 90, 30],     # 橙红
            [200, 10, 20],     # 红（热）
        ],
        dtype=np.float32,
    )
    xs = np.linspace(0, 1, len(anchors))
    xs_new = np.linspace(0, 1, n)
    cmap = np.stack(
        [np.interp(xs_new, xs, anchors[:, i]) for i in range(3)], axis=1
    )
    return cmap.astype(np.uint8)


def render_sst(sst_arr, mask, lat2d, lon2d, scale, cy, cx, vmin, vmax):
    sampled = sample_scalar(sst_arr.astype(np.float64), lat2d, lon2d, scale, cy, cx)
    m = sample_scalar(mask.astype(np.float64), lat2d, lon2d, scale, cy, cx, cval=0.0)
    valid = (m > 0.5) & np.isfinite(sampled)
    norm = (np.clip(sampled, vmin, vmax) - vmin) / max(vmax - vmin, 1e-6)
    norm = np.nan_to_num(norm, nan=0.0, posinf=1.0, neginf=0.0)
    idx = np.clip((norm * 255).astype(np.int32), 0, 255)
    cmap = cmap_blue_red()
    rgb = cmap[idx]
    land = np.array([70, 70, 70], dtype=np.uint8)
    rgb[~valid] = land
    return rgb, sampled, valid


def parse_time_from_name(name):
    m = re.search(r"_(\d{14})_", name)
    if not m:
        raise RuntimeError(f"文件名缺少时间：{name}")
    t = m.group(1)
    return f"{t[0:4]}-{t[4:6]}-{t[6:8]}T{t[8:10]}:{t[10:12]}:{t[12:14]}Z"


def main():
    from PIL import Image as PILImage
    PILImage.MAX_IMAGE_PIXELS = None  # FY-4B 全圆盘约 1.3 亿像素，关闭解压炸弹阈值

    jpgs = sorted(glob.glob(os.path.join(WORK, "*.JPG")))
    ncs = sorted(glob.glob(os.path.join(WORK, "*.NC")))
    print("satellite JPG:", len(jpgs), " SST NC:", len(ncs))
    if not jpgs or not ncs:
        raise RuntimeError("工作目录缺少 JPG 或 NC 文件")

    # ---- 1. 圆盘定标（用第一帧真彩图）----
    pil = Image.open(jpgs[0]).convert("RGB")
    W, Hh = pil.size
    print(f"GCLR 尺寸: {W}x{Hh}")
    img = np.asarray(pil)
    pil.close()
    gray = img[:, :, 0].astype(np.float32) * 0.299 + img[:, :, 1].astype(np.float32) * 0.587 + img[:, :, 2].astype(np.float32) * 0.114
    cy, cx = (Hh - 1) / 2.0, (W - 1) / 2.0
    radius_px = measure_limb_radius(gray.astype(np.uint8), int(cy), int(cx))
    scale_rad_per_px = math.radians(HALF_DEG) / radius_px
    print(f"圆盘半径={radius_px:.1f}px  扫描角采样={math.degrees(scale_rad_per_px)*3600:.2f}角秒/px  中心=({cx},{cy})")

    # ---- 2. 目标网格 ----
    lat2d, lon2d = build_region_grid()

    # ---- 3. 卫星帧重投影 ----
    captions = {
        "2024-09-01T00:00:00Z": "生成阶段：初始热带扰动云系（轨迹等级：热带低压）",
        "2024-09-02T00:00:00Z": "发展：云系组织加强（轨迹等级：热带风暴）",
        "2024-09-03T00:00:00Z": "发展：继续向西北方向移动（轨迹等级：热带风暴）",
        "2024-09-04T00:00:00Z": "进入南海东北部并快速增强（轨迹等级：台风）",
        "2024-09-05T06:00:00Z": "快速增强至超强台风（轨迹峰值附近）",
        "2024-09-06T06:00:00Z": "登陆前：云系逼近海南岛（轨迹等级：超强台风）",
    }
    sat_frames = []
    for jpg in jpgs:
        name = os.path.basename(jpg)
        ts = parse_time_from_name(name)
        pil = Image.open(jpg).convert("RGB")
        img = np.asarray(pil)
        pil.close()
        rgb = sample_rgb(img, lat2d, lon2d, scale_rad_per_px, cy, cx)
        out_id = "fy4b-agri-gclr-" + ts.replace("-", "").replace("T", "").replace(":", "")[:12]
        out_png = os.path.join(SAT_DIR, f"{out_id}.png")
        Image.fromarray(rgb).save(out_png, optimize=True)
        sat_frames.append(
            {
                "id": out_id,
                "timestamp": ts,
                "satellite": "FY-4B",
                "instrument": "AGRI",
                "product": SAT_PRODUCT,
                "imagePath": f"real/yagi-2024/environment/satellite/imagery/{out_id}.png",
                "bbox": REGION,
                "source": ORG,
                "sourceUrl": URL_MAIN,
                "sourceType": "satellite",
                "processing": SAT_PROC_BASE,
                "caption": captions.get(ts, ""),
            }
        )
        print(f"  卫星帧 {ts} -> {out_id}.png ({os.path.getsize(out_png)//1024} KB)")

    # ---- 4. SST 渲染 ----
    # 4KM 网格角采样 = 1KM 的 4 倍（更粗）→ 乘 4，而非除 4
    scale4 = scale_rad_per_px * 4.0
    cy4, cx4 = (2748 - 1) / 2.0, (2748 - 1) / 2.0
    sst_frames = []
    for nc in ncs:
        name = os.path.basename(nc)
        ds = None
        try:
            import netCDF4
            ds = netCDF4.Dataset(nc)
            # 注意：该产品使用掩膜数组（陆地/空间/无效像元为 masked），统一转为 NaN
            sst = ds.variables["SST"][:].filled(np.nan).astype(np.float64)
            dqf = ds.variables["DQF"][:].filled(127).astype(np.int16)
            valid_range = ds.variables["SST"].valid_range
            valid = (sst >= valid_range[0]) & (sst <= valid_range[1]) & (dqf <= 1)
            sst_masked = np.where(valid, sst, np.nan)
        finally:
            if ds is not None:
                ds.close()

        ts = parse_time_from_name(name)
        date = ts[:10]
        # 先粗采样确定数值范围（用区域统计），再渲染
        lat2d_c, lon2d_c = build_region_grid()
        probe = sample_scalar(sst_masked, lat2d_c, lon2d_c, scale4, cy4, cx4)
        finite = probe[np.isfinite(probe)]
        if finite.size == 0:
            raise RuntimeError(f"{name}: 区域内无有效 SST 值")
        vmin = float(np.floor(np.percentile(finite, 2) * 10) / 10)
        vmax = float(np.ceil(np.percentile(finite, 98) * 10) / 10)
        rgb, sampled, validmask = render_sst(sst_masked, valid.astype(np.uint8), lat2d_c, lon2d_c, scale4, cy4, cx4, vmin, vmax)
        out_id = "fy4b-agri-sst-" + date.replace("-", "")
        out_png = os.path.join(SST_DIR, f"{out_id}.png")
        Image.fromarray(rgb).save(out_png, optimize=True)
        sst_frames.append(
            {
                "id": out_id,
                "date": date,
                "satellite": "FY-4B",
                "instrument": "AGRI",
                "product": SST_PRODUCT,
                "imagePath": f"real/yagi-2024/environment/sst/imagery/{out_id}.png",
                "bbox": REGION,
                "unit": "°C",
                "valueRange": [vmin, vmax],
                "source": ORG,
                "sourceUrl": URL_MAIN,
                "sourceType": "ocean-observation",
                "processing": SST_PROC,
                "legend": f"自定义蓝→红渐变色带（{vmin}–{vmax} °C）；灰色=无有效观测（云覆盖/陆地/无效像元），未插值",
            }
        )
        valid_frac = validmask.mean() * 100
        print(
            f"  SST {date}: 有效占比 {valid_frac:.1f}%  色带 {vmin}-{vmax} °C  "
            f"区域统计 min={np.nanmin(sampled):.1f} max={np.nanmax(sampled):.1f} mean={np.nanmean(sampled):.1f}"
        )
        # 物理一致性检查点
        checks = [
            ("南海中部 (115E,18N)", 115.0, 18.0),
            ("海南以东 (111E,19.5N)", 111.0, 19.5),
            ("台湾海峡 (119E,23N)", 119.0, 23.0),
            ("北部湾 (108E,20.5N)", 108.0, 20.5),
            ("海南岛 (110E,19N)", 110.0, 19.0),
        ]
        for label, lo, la in checks:
            v = sample_scalar(sst_masked, np.array([[la]]), np.array([[lo]]), scale4, cy4, cx4)[0, 0]
            print(f"     检查点 {label}: {v if np.isfinite(v) else '无值(陆/空)'}")

    # ---- 5. 写 manifest ----
    sat_manifest = {
        "schemaVersion": 1,
        "status": "available",
        "note": "由 scripts/import_fy4b_env.py 生成：FY-4B AGRI 真彩官方产品，经标称网格→EPSG:4326 重投影与区域裁剪（见各帧 processing），气象数值未修改。",
        "frames": sat_frames,
    }
    sst_manifest = {
        "schemaVersion": 1,
        "status": "available",
        "note": "由 scripts/import_fy4b_env.py 生成：FY-4B AGRI SST L2 官方产品，重投影/掩膜/色带渲染（见各帧 processing），SST 数值未修改，单位 °C。该时次南海受台风外围云系覆盖，有效观测稀疏，仅展示 DQF<=1 高质量像元，未插值。",
        "frames": sst_frames,
    }
    with open(os.path.join(OUT, "satellite_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(sat_manifest, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUT, "sst_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(sst_manifest, f, ensure_ascii=False, indent=2)
    print("完成：satellite_manifest.json / sst_manifest.json 已生成")


if __name__ == "__main__":
    main()
