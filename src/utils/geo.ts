/**
 * 生成近似圆（等距方位近似，科普演示精度足够）。
 * 返回闭合环坐标（首尾相同），GeoJSON Polygon 直接可用。
 */
export function circlePolygon(
  center: [number, number],
  radiusKm: number,
  segments = 36,
): number[][] {
  const [lon, lat] = center
  const latRad = (lat * Math.PI) / 180
  const dLatPerKm = 1 / 110.574
  const dLonPerKm = 1 / (111.32 * Math.cos(latRad))
  const ring: number[][] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    ring.push([
      lon + Math.cos(angle) * radiusKm * dLonPerKm,
      lat + Math.sin(angle) * radiusKm * dLatPerKm,
    ])
  }
  ring.push([...ring[0]])
  return ring
}
