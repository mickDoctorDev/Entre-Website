// Map projection: 1 SVG unit = 5 m, centred on Pathum Wan (viewBox 400x640).
const LAT0 = 13.7456, LNG0 = 100.534, KX = 21600, KY = 22120
export type LL = { lat: number; lng: number }

export const toXY = (p: LL) => ({ x: 200 + (p.lng - LNG0) * KX, y: 250 - (p.lat - LAT0) * KY })
export const fromXY = (x: number, y: number): LL => ({ lat: LAT0 - (y - 250) / KY, lng: LNG0 + (x - 200) / KX })

export function distM(a: LL, b: LL) {
  const R = 6371000, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const walkMin = (m: number) => Math.max(1, Math.round(m / 80))
export const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} ม.` : `${(m / 1000).toFixed(1)} กม.`)
export const ago = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000)
  return s > 60 ? 'ไม่มีสัญญาณ' : `${Math.max(s, 1)} วิที่แล้ว`
}
