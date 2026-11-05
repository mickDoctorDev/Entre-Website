import type { Truck } from '../lib/store'

// Isometric (2:1) city window. Buildings are real extruded boxes; trucks and people are
// side-view sprites skewed into the road plane so they look 3D while they move.
const U = 28, OX = 450, OY = -40
const iso = (gx: number, gy: number): [number, number] => [OX + (gx - gy) * U, OY + ((gx + gy) * U) / 2]
const poly = (p: [number, number][]) => p.map(([x, y]) => iso(x, y).join(',')).join(' ')

const Box = ({ x, y, w, d, h, c }: { x: number; y: number; w: number; d: number; h: number; c: string }) => {
  const [ax, ay] = iso(x, y), [bx, by] = iso(x + w, y), [cx, cy] = iso(x + w, y + d), [dx, dy] = iso(x, y + d)
  return (
    <g className={`bx ${c}`}>
      <polygon points={`${bx},${by} ${cx},${cy} ${cx},${cy - h} ${bx},${by - h}`} className="bx-r" />
      <polygon points={`${dx},${dy} ${cx},${cy} ${cx},${cy - h} ${dx},${dy - h}`} className="bx-l" />
      <polygon points={`${ax},${ay - h} ${bx},${by - h} ${cx},${cy - h} ${dx},${dy - h}`} className="bx-t" />
    </g>
  )
}

const Tree = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => {
  const [px, py] = iso(x, y)
  return (
    <g transform={`translate(${px} ${py}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="12" ry="5" className="sh" />
      <rect x="-2" y="-12" width="4" height="14" rx="2" fill="#B98A5E" />
      <circle cx="0" cy="-22" r="12" fill="#3DBE7A" /><circle cx="-5" cy="-26" r="6" fill="#7ED957" opacity=".8" />
    </g>
  )
}

const Road = ({ axis, at, from, to }: { axis: 'x' | 'y'; at: number; from: number; to: number }) => {
  const hw = 0.9 // half width in tiles
  const p: [number, number][] = axis === 'x'
    ? [[from, at - hw], [to, at - hw], [to, at + hw], [from, at + hw]]
    : [[at - hw, from], [at + hw, from], [at + hw, to], [at - hw, to]]
  const line = axis === 'x' ? [[from, at], [to, at]] : [[at, from], [at, to]]
  return (
    <>
      <polygon points={poly(p)} className="rd" />
      <polyline points={line.map(([x, y]) => iso(x, y).join(',')).join(' ')} className="rd-l" />
    </>
  )
}

// ---- sprites (drawn side-on, facing +x, base centre at 0,0) ----
function TruckArt({ color, asleep }: { color: string; asleep: boolean }) {
  return (
    <g className={asleep ? '' : 'bob'}>
      <ellipse cx="0" cy="3" rx="30" ry="6" className="sh" />
      <rect x="-30" y="-34" width="34" height="26" rx="6" fill={color} />
      <rect x="-30" y="-14" width="34" height="6" rx="3" fill="rgba(0,0,0,.14)" />
      <path d="M-18 -26c2-4 7-4 9 0 2 4-4 8-4.5 9-.5-1-6.500-5-4.500-9z" fill="#fff" opacity=".9" />
      <rect x="4" y="-26" width="24" height="18" rx="6" fill="#FFF7E6" />
      <rect x="14" y="-24" width="12" height="9" rx="3" fill="#BFE3FF" />
      <circle cx="12" cy="-18" r="3.4" fill="#fff" stroke="#12202B" strokeWidth="1" /><circle cx="12.8" cy="-17.6" r="1.5" fill="#12202B" />
      {asleep
        ? <path d="M8 -9h8" stroke="#12202B" strokeWidth="1.5" strokeLinecap="round" />
        : <path d="M8 -9q4 3.500 8 0" stroke="#12202B" strokeWidth="1.5" fill="none" strokeLinecap="round" />}
      <rect x="27" y="-14" width="4" height="4" rx="2" fill="#FFC83D" />
      {[-16, 14].map((x) => (
        <g key={x} transform={`translate(${x} -3)`}>
          <circle r="7" fill="#12202B" />
          <g className="spin"><circle r="3.500" fill="#E3ECF5" /><rect x="-.8" y="-3.500" width="1.600" height="7" fill="#12202B" /></g>
        </g>
      ))}
      {asleep && <text x="22" y="-36" className="zzz">z z</text>}
    </g>
  )
}

function PersonArt({ shirt, bag }: { shirt: string; bag?: boolean }) {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="8" ry="3" className="sh" />
      <g className="step">
        <rect className="leg" x="-4.500" y="-14" width="4" height="14" rx="2" fill="#2F4B7C" />
        <rect className="leg b" x="0.500" y="-14" width="4" height="14" rx="2" fill="#2F4B7C" />
        <rect x="-6" y="-28" width="12" height="16" rx="5" fill={shirt} />
        <rect className="arm" x="-8" y="-27" width="3.500" height="12" rx="1.800" fill={shirt} />
        <rect className="arm b" x="4.500" y="-27" width="3.500" height="12" rx="1.800" fill={shirt} />
        {bag && <circle cx="9" cy="-12" r="4" fill="#3DBE7A" stroke="#067647" strokeWidth="1" />}
        <circle cx="0" cy="-34" r="6" fill="#FFD9B8" />
        <path d="M-6 -35c0-6 12-6 12 0-3-2-9-2-12 0z" fill="#5B3A29" />
        <circle cx="2" cy="-34" r=".9" fill="#12202B" />
      </g>
    </g>
  )
}

// A mover follows a road: `dir` 'x' = down-right, 'y' = down-left. p = start phase (0..1).
type Mover = { kind: 'truck' | 'person'; dir: 'x' | 'y'; at: [number, number]; p: number; dur: number; color: string; bag?: boolean; i?: number }

const TRUCK_COLORS = ['#3DBE7A', '#2F9BFF', '#FFB020', '#FF7A66']
const PEOPLE: Mover[] = [
  { kind: 'person', dir: 'x', at: iso(5, 4.3), p: 0.1, dur: 46, color: '#FF7A66', bag: true },
  { kind: 'person', dir: 'x', at: iso(9, 1.7), p: 0.6, dur: 52, color: '#7C6CFF' },
  { kind: 'person', dir: 'y', at: iso(9.5, 6), p: 0.3, dur: 50, color: '#FFC83D', bag: true },
  { kind: 'person', dir: 'x', at: iso(4, 10.3), p: 0.45, dur: 48, color: '#2F9BFF' },
  { kind: 'person', dir: 'y', at: iso(6.7, 4), p: 0.8, dur: 54, color: '#10B26C' },
]

function Sprite({ m, truck }: { m: Mover; truck?: Truck }) {
  const k = m.kind === 'truck' ? 1.6 : 1.5 // sprites are drawn small, scale up so they read at a glance
  const skew = m.dir === 'x' ? `skewY(26.565) scale(${k})` : `skewY(-26.565) scale(${-k} ${k})`
  const dx = m.dir === 'x' ? 440 : -440
  const parked = truck?.status === 'offline'
  return (
    <g transform={`translate(${m.at[0]} ${m.at[1]})`}>
      <g className={parked ? '' : 'mv'} style={{ ['--dx' as string]: dx, ['--dy' as string]: 220, ['--p' as string]: parked ? 0.5 : m.p, ['--dur' as string]: `${m.dur}s` }}>
        <g transform={skew}>{m.kind === 'truck' ? <TruckArt color={m.color} asleep={!!parked} /> : <PersonArt shirt={m.color} bag={m.bag} />}</g>
      </g>
    </g>
  )
}

export default function AdminScene({ trucks }: { trucks: Truck[] }) {
  const t = (i: number) => trucks[i]
  const trucksOnRoad: Mover[] = [
    { kind: 'truck', dir: 'x', at: iso(8, 3 - 0.35), p: 0.15, dur: 26, color: TRUCK_COLORS[0], i: 0 },
    { kind: 'truck', dir: 'y', at: iso(8 + 0.35, 6), p: 0.5, dur: 30, color: TRUCK_COLORS[1], i: 1 },
    { kind: 'truck', dir: 'x', at: iso(8, 9 - 0.35), p: 0.7, dur: 28, color: TRUCK_COLORS[2], i: 2 },
    { kind: 'truck', dir: 'y', at: iso(8 + 0.35, 2), p: 0.9, dur: 34, color: TRUCK_COLORS[3], i: 3 },
  ]
  return (
    <div className="scene" aria-hidden="true">
      <svg viewBox="0 0 900 280" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#BFE0FF" /><stop offset=".6" stopColor="#E6F6EE" /><stop offset="1" stopColor="#FFF1CF" /></linearGradient>
        </defs>
        <rect width="900" height="280" fill="url(#sky)" />
        <circle cx="810" cy="52" r="26" fill="#FFD65A" opacity=".9" /><circle cx="810" cy="52" r="44" fill="#FFD65A" opacity=".25" />
        <g className="clouds"><ellipse cx="120" cy="40" rx="50" ry="13" /><ellipse cx="150" cy="32" rx="30" ry="10" /><ellipse cx="560" cy="26" rx="46" ry="12" /><ellipse cx="330" cy="60" rx="34" ry="9" /></g>
        <polygon points="-200,-100 1100,-100 1100,400 -200,400" fill="#CFEFD9" opacity=".55" />
        <Road axis="x" at={3} from={-10} to={30} /><Road axis="x" at={9} from={-10} to={30} /><Road axis="y" at={8} from={-10} to={30} />
        {/* back to front so nearer things overlap farther ones */}
        <Box x={3} y={-1} w={3} d={2.2} h={34} c="c1" />
        <Box x={11} y={-1.5} w={3} d={2.5} h={44} c="c2" />
        <Box x={4} y={5} w={3} d={3} h={28} c="c3" />
        <Tree x={2} y={6} /><Tree x={2.6} y={7.6} s={.9} />
        <Box x={11} y={4.5} w={3.2} d={3} h={52} c="c4" />
        <Tree x={9.8} y={4.1} s={.85} />
        <Box x={1} y={10.8} w={3} d={2.6} h={36} c="c5" />
        <Box x={5} y={11} w={2.4} d={2.4} h={24} c="c1" />
        <Tree x={10} y={11} /><Tree x={11.4} y={12} s={.9} />
        <Box x={11} y={10.6} w={3} d={2.6} h={40} c="c3" />
        {PEOPLE.slice(0, 5).map((m, i) => <Sprite key={`p${i}`} m={m} />)}
        {trucksOnRoad.map((m) => <Sprite key={`t${m.i}`} m={m} truck={t(m.i ?? 0)} />)}
      </svg>
    </div>
  )
}
