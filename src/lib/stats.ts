// MOCK entries-per-period series. Today's bar always comes from the live hourly numbers.
export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'
export interface Series { values: number[]; short: string[]; full: string[]; every: number }

const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
// deterministic pseudo-random so the mock does not jump on every render
const dayVal = (d: Date) => Math.round(250 + 80 * Math.sin(d.getDate() * 0.9) + (d.getDay() === 0 || d.getDay() === 6 ? 110 : 0) + ((d.getDate() * 37 + d.getMonth() * 11) % 41))

export function series(p: Period, hourly: number[]): Series {
  const now = new Date(), today = sum(hourly)
  if (p === 'daily') {
    const h = hourly.map((_, i) => `${8 + i}`)
    return { values: hourly, short: h, full: hourly.map((_, i) => `${8 + i}:00`), every: 1 }
  }
  if (p === 'weekly') {
    const days = Array.from({ length: 7 }, (_, i) => addDays(now, i - 6))
    return { values: days.map((d, i) => (i === 6 ? today : dayVal(d))), short: days.map((d) => DOW[d.getDay()]), full: days.map((d) => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`), every: 1 }
  }
  if (p === 'monthly') {
    const days = Array.from({ length: 30 }, (_, i) => addDays(now, i - 29))
    return { values: days.map((d, i) => (i === 29 ? today : dayVal(d))), short: days.map((d) => `${d.getDate()}`), full: days.map((d) => `${d.getDate()} ${MON[d.getMonth()]}`), every: 5 }
  }
  const months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() + i - 11, 1))
  const base = [5200, 4800, 5600, 6100, 6900, 6200, 5800, 6400, 7000, 7300, 6900, 8100]
  return { values: months.map((m, i) => (i === 11 ? 3000 + today * 8 : base[m.getMonth()])), short: months.map((m) => MON[m.getMonth()]), full: months.map((m) => `${MON[m.getMonth()]} ${m.getFullYear() + 543}`), every: 2 }
}
