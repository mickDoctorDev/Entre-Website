import { useRef, useState } from 'react'
import type { Truck } from '../lib/store'
import { toXY, fmtDist, type LL } from '../lib/geo'

type Props = {
  trucks: Truck[]; user?: LL; nearestId?: string; selectedId?: string
  onSelect?: (id: string) => void; dark?: boolean; radar?: boolean; fit?: 'slice' | 'meet'
  pannable?: boolean; nearestDist?: number
  route?: { id: string; to: LL } // animated path from `user` to a truck
}

const Tree = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} className="m-tree">
    <circle r="9" cy="-4" /><circle r="6" cx="-6" cy="2" /><circle r="6" cx="6" cy="2" />
  </g>
)

function Art({ clouds }: { clouds: boolean }) {
  return (
    <g>
      <defs>
        <linearGradient id="bgL" gradientUnits="userSpaceOnUse" x1="0" y1="-200" x2="0" y2="840">
          <stop offset="0" stopColor="#D9ECFF" /><stop offset=".45" stopColor="#E8F8F0" /><stop offset="1" stopColor="#FFF4DC" />
        </linearGradient>
        <linearGradient id="routeG" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="0">
          <stop offset="0" stopColor="#2F9BFF" /><stop offset="1" stopColor="#10B26C" />
        </linearGradient>
      </defs>
      <rect x="-200" y="-200" width="800" height="1040" className="m-base" />
      {/* Saen Saeb canal */}
      <path d="M-40 118 C90 160 200 84 440 140" className="m-water" fill="none" strokeWidth="28" strokeLinecap="round" />
      {/* roads */}
      <g className="m-road" fill="none" strokeLinecap="round">
        <path d="M-40 262 L440 242" strokeWidth="16" /><path d="M-40 424 L440 330" strokeWidth="14" />
        <path d="M182 -40 L204 680" strokeWidth="16" /><path d="M300 -40 L282 680" strokeWidth="14" />
        <path d="M-40 520 L440 520" strokeWidth="12" /><path d="M96 170 L120 680" strokeWidth="10" />
      </g>
      {/* blocks */}
      <g className="m-block">
        <rect className="b1" x="214" y="270" width="56" height="42" rx="9" /><rect className="b2" x="120" y="274" width="48" height="40" rx="9" />
        <rect className="b3" x="212" y="196" width="60" height="36" rx="9" /><rect className="b4" x="310" y="262" width="60" height="50" rx="9" />
        <rect className="b5" x="124" y="338" width="44" height="54" rx="9" /><rect className="b1" x="214" y="350" width="52" height="46" rx="9" />
        <rect className="b2" x="312" y="358" width="56" height="44" rx="9" /><rect className="b3" x="40" y="196" width="46" height="48" rx="9" />
        <rect className="b4" x="40" y="276" width="42" height="46" rx="9" /><rect className="b5" x="310" y="188" width="56" height="42" rx="9" />
        <rect className="b1" x="130" y="196" width="40" height="40" rx="9" /><rect className="b2" x="40" y="340" width="44" height="60" rx="9" />
      </g>
      {/* parks */}
      <path d="M232 440 C250 425 320 430 345 452 C365 478 340 520 300 524 C250 528 222 470 232 440Z" className="m-park" />
      <path d="M32 440 C50 430 88 436 92 462 C96 488 60 500 40 488 C24 476 22 452 32 440Z" className="m-park" />
      <Tree x={262} y={470} s={1.3} /><Tree x={300} y={486} /><Tree x={322} y={462} s={1.1} /><Tree x={58} y={462} /><Tree x={78} y={478} s={.9} />
      <Tree x={150} y={218} s={.8} /><Tree x={352} y={290} s={.8} /><Tree x={70} y={316} s={.8} />
      <g className="m-label">
        <text x="40" y="150" transform="rotate(8 40 150)">คลองแสนแสบ</text>
        <text x="236" y="292">สยามสแควร์</text><text x="128" y="298">MBK</text>
        <text x="258" y="498">สวนลุมพินี</text><text x="318" y="288">CentralWorld</text>
      </g>
      {clouds && (
        <g className="m-cloud"><ellipse cx="60" cy="40" rx="70" ry="22" /><ellipse cx="350" cy="560" rx="90" ry="26" /><ellipse cx="330" cy="30" rx="50" ry="16" /></g>
      )}
    </g>
  )
}

const Pin = ({ x, y, children, onClick, label }: { x: number; y: number; children: React.ReactNode; onClick?: () => void; label: string }) => (
  <g className="pin" style={{ transform: `translate(${x}px,${y}px)` }} role="button" tabIndex={0} aria-label={label}
    onClick={onClick} onKeyDown={(e) => e.key === 'Enter' && onClick?.()}>
    {children}
  </g>
)

const Label = ({ text, accent }: { text: string; accent?: boolean }) => {
  const w = text.length * 5.2 + 14
  return (
    <g transform="translate(0 25)">
      <rect x={-w / 2} y="-8" width={w} height="16" rx="8" className={accent ? 'lbl lbl-accent' : 'lbl'} />
      <text textAnchor="middle" y="3" className="lbl-t">{text}</text>
    </g>
  )
}

// Stylised route: one vertical leg then one horizontal leg with a rounded corner (not real road routing).
function Route({ a, b }: { a: { x: number; y: number }; b: { x: number; y: number } }) {
  const r = 14, dx = Math.sign(b.x - a.x), dy = Math.sign(b.y - a.y)
  const d = !dx || !dy || Math.abs(b.x - a.x) < r * 2 || Math.abs(b.y - a.y) < r * 2
    ? `M${a.x} ${a.y} L${a.x} ${b.y} L${b.x} ${b.y}`
    : `M${a.x} ${a.y} L${a.x} ${b.y - dy * r} Q${a.x} ${b.y} ${a.x + dx * r} ${b.y} L${b.x} ${b.y}`
  return (
    <g className="route" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} pathLength={1} className="route-halo" />
      <path d={d} pathLength={1} className="route-line" />
      <path d={d} className="route-flow" />
      <circle cx={b.x} cy={b.y} r="22" className="route-dest" />
    </g>
  )
}

const LIM_X = 90, LIM_Y = 120 // pan limits in map units, so the drawn city never runs out
const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))

export default function CityMap({ trucks, user, nearestId, selectedId, onSelect, dark, radar, fit = 'slice', pannable, nearestDist, route }: Props) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const ref = useRef<SVGSVGElement>(null)
  const drag = useRef<{ px: number; py: number; ox: number; oy: number; k: number; moved: boolean } | null>(null)
  const down = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    drag.current = { px: e.clientX, py: e.clientY, ox: pan.x, oy: pan.y, k: Math.max(r.width / 400, r.height / 640), moved: false }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.px, dy = e.clientY - d.py
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 6) return // below threshold it is still a tap on a pin
      d.moved = true; ref.current!.setPointerCapture(e.pointerId)
    }
    setPan({ x: clamp(d.ox + dx / d.k, LIM_X), y: clamp(d.oy + dy / d.k, LIM_Y) })
  }
  const u = user && toXY(user)
  const ordered = [...trucks].sort((a, b) => Number(a.id === nearestId) - Number(b.id === nearestId))
  return (
    <>
    <svg ref={ref} viewBox="0 0 400 640" preserveAspectRatio={`xMidYMid ${fit}`} className={`citymap ${dark ? 'map-dark' : 'map-light'}${pannable ? ' pannable' : ''}`} role="img" aria-label="แผนที่รถห้องน้ำเขตปทุมวัน"
      onPointerDown={pannable ? down : undefined} onPointerMove={pannable ? move : undefined} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
      <g style={{ transform: `translate(${pan.x}px,${pan.y}px)` }}>
      <Art clouds={!dark} />
      {u && route && (() => {
        const t = trucks.find((x) => x.id === route.id)
        return t ? <Route key={route.id} a={u} b={toXY(t)} /> : null
      })()}
      {radar && <g className="sweep"><path d="M200 250 L200 -150 A400 400 0 0 1 420 -60 Z" /></g>}
      {ordered.map((t) => {
        const { x, y } = toXY(t), near = t.id === nearestId
        return (
          <Pin key={t.id} x={x} y={y} label={`${t.name} ${t.status}`} onClick={() => onSelect?.(t.id)}>
            <g className={`truck st-${t.status}${near ? ' near' : ''}${selectedId === t.id ? ' sel' : ''}`}>
              {near && <><circle r="16" className="pulse" /><circle r="16" className="pulse p2" /></>}
              <circle r="15" className="t-bg" />
              <g className="bin" transform="translate(11 -11)"><circle r="7" className="bin-b" /><text textAnchor="middle" y="3.2" className="bin-t">♻</text></g>
              <g className="t-ico"><rect x="-8" y="-6" width="10" height="9" rx="1.5" /><path d="M3 -3h4l3 3.5v2.5H3z" /><circle cx="-4" cy="5" r="2" /><circle cx="6" cy="5" r="2" /></g>
            </g>
            <Label text={near && nearestDist != null ? `ใกล้ที่สุด · ${fmtDist(nearestDist)}` : t.name} accent={near} />
          </Pin>
        )
      })}
      {u && (
        <g className="pin" style={{ transform: `translate(${u.x}px,${u.y}px)` }} aria-label="ตำแหน่งของคุณ">
          <circle r="14" className="pulse user-pulse" /><circle r="7" className="user-dot" />
        </g>
      )}
      </g>
    </svg>
    {pannable && (pan.x !== 0 || pan.y !== 0) && <button className="recenter" onClick={() => setPan({ x: 0, y: 0 })} aria-label="กลับไปตำแหน่งของฉัน">◎</button>}
    </>
  )
}
