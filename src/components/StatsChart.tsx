import { useMemo } from 'react'
import { series, type Period } from '../lib/stats'

const TABS: [Period, string][] = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']]

// Toilet entries per hour/day/week/month. Picking a bar replays the 3D city at that bar's crowd size.
export default function StatsChart({ hourly, period, onPeriod, selected, onSelect }: { hourly: number[]; period: Period; onPeriod: (p: Period) => void; selected: number | null; onSelect: (i: number | null) => void }) {
  const s = useMemo(() => series(period, hourly), [period, hourly])
  const n = s.values.length, idx = selected ?? n - 1
  const max = Math.max(...s.values, 1), total = s.values.reduce((a, b) => a + b, 0), peak = s.values.indexOf(max)
  return (
    <section className="stats glass" aria-label="สถิติการเข้าห้องน้ำ">
      <div className="st-top">
        <div className="st-tabs" role="tablist" aria-label="ช่วงเวลา">
          {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={period === k} onClick={() => onPeriod(k)}>{label}</button>)}
        </div>
        <button className="st-live" aria-pressed={selected === null} onClick={() => onSelect(null)}>Now</button>
      </div>
      <div className="st-nums">
        <div><small>{s.full[idx]}</small><b className="num">{s.values[idx].toLocaleString()}</b></div>
        <div><small>รวม</small><b className="num">{total.toLocaleString()}</b></div>
        <div><small>เฉลี่ย</small><b className="num">{Math.round(total / n).toLocaleString()}</b></div>
        <div><small>สูงสุด</small><b className="num">{s.short[peak]}</b></div>
      </div>
      <div className="st-bars" role="group" aria-label="แท่งสถิติ เลือกเพื่อดูฉากเมืองตามจำนวนคน" style={{ ['--n' as string]: n }}>
        {s.values.map((v, i) => (
          <button key={i} aria-pressed={idx === i} aria-label={`${s.full[i]} มี ${v} คน`} title={`${s.full[i]}: ${v}`} onClick={() => onSelect(i === n - 1 && selected === null ? null : i)} style={{ ['--h' as string]: v / max }}>
            <i /><span>{i % s.every === 0 || i === n - 1 ? s.short[i] : ''}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
