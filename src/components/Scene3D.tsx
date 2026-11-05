import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Truck } from '../lib/store'
import AdminScene from './AdminScene'

// A tiny low-poly diorama built from primitives (no model files): cute garbage trucks loop around
// a recycling centre and tip their beds, while people walk the pavements. Orthographic camera = isometric look.
const REDUCE = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const MOBILE = typeof innerWidth !== 'undefined' && innerWidth < 700

// ---------- paths & shapes ----------
function rrShape(h: number, r: number) {
  const s = new THREE.Shape(), c = h - r
  s.moveTo(-c, -h); s.lineTo(c, -h); s.absarc(c, -c, r, -Math.PI / 2, 0, false)
  s.lineTo(h, c); s.absarc(c, c, r, 0, Math.PI / 2, false)
  s.lineTo(-c, h); s.absarc(-c, c, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-h, -c); s.absarc(-c, -c, r, Math.PI, Math.PI * 1.5, false)
  return s
}
function loop(h: number, r: number, reverse = false) {
  const c = h - r, pts: THREE.Vector3[] = []
  ;([[c, c, 0], [-c, c, Math.PI / 2], [-c, -c, Math.PI], [c, -c, Math.PI * 1.5]] as const).forEach(([cx, cz, a0]) => {
    for (let i = 0; i <= 4; i++) { const a = a0 + (i / 4) * (Math.PI / 2); pts.push(new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)) }
  })
  if (reverse) pts.reverse()
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5)
}
const tmp = new THREE.Vector3()
function place(g: THREE.Object3D, curve: THREE.CatmullRomCurve3, u: number) {
  const k = ((u % 1) + 1) % 1
  curve.getPointAt(k, tmp); g.position.x = tmp.x; g.position.z = tmp.z
  curve.getTangentAt(k, tmp); g.rotation.y = Math.atan2(tmp.x, tmp.z)
}
const ease = (t: number) => t * t * (3 - 2 * t)

// ---------- static world ----------
function Ring({ outer, inner, y, color }: { outer: [number, number]; inner: [number, number]; y: number; color: string }) {
  const geo = useMemo(() => {
    const s = rrShape(outer[0], outer[1])
    s.holes.push(new THREE.Path(rrShape(inner[0], inner[1]).getPoints(12)))
    return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false, curveSegments: 12 })
  }, [outer, inner])
  return <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow><meshStandardMaterial color={color} /></mesh>
}

const Tree = ({ x, z, s = 1 }: { x: number; z: number; s?: number }) => (
  <group position={[x, 0, z]} scale={s}>
    <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.1, 0.14, 0.7, 6]} /><meshStandardMaterial color="#B98A5E" /></mesh>
    <mesh position={[0, 1.15, 0]} castShadow><icosahedronGeometry args={[0.65, 1]} /><meshStandardMaterial color="#3DBE7A" flatShading /></mesh>
    <mesh position={[0.2, 1.5, 0.1]}><icosahedronGeometry args={[0.35, 1]} /><meshStandardMaterial color="#7ED957" flatShading /></mesh>
  </group>
)

const Building = ({ x, z, w, h, d, c }: { x: number; z: number; w: number; h: number; d: number; c: string }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={c} /></mesh>
    <mesh position={[0, h * 0.62, 0]}><boxGeometry args={[w + 0.04, 0.3, d + 0.04]} /><meshStandardMaterial color="#fff" opacity={0.7} transparent /></mesh>
    <mesh position={[0, h * 0.28, 0]}><boxGeometry args={[w + 0.04, 0.3, d + 0.04]} /><meshStandardMaterial color="#fff" opacity={0.7} transparent /></mesh>
    <mesh position={[0, h + 0.1, 0]} castShadow><boxGeometry args={[w + 0.2, 0.2, d + 0.2]} /><meshStandardMaterial color="#fff" /></mesh>
  </group>
)

function World() {
  return (
    <group>
      <mesh position={[0, -0.25, 0]} receiveShadow><boxGeometry args={[40, 0.5, 40]} /><meshStandardMaterial color="#CFEFD9" /></mesh>
      <mesh position={[0, -0.75, 0]}><boxGeometry args={[40.6, 0.5, 40.6]} /><meshStandardMaterial color="#A7D9B8" /></mesh>
      <Ring outer={[8.3, 2.4]} inner={[6.9, 2.1]} y={0.01} color="#F6F8FB" />
      <Ring outer={[6.9, 2.1]} inner={[4.3, 1]} y={0.01} color="#DCE6F2" />
      <Ring outer={[5.65, 1.7]} inner={[5.55, 1.65]} y={0.08} color="#fff" />
      <Ring outer={[4.3, 1]} inner={[0.01, 0.005]} y={0.01} color="#E3F6EA" />
      {/* recycling centre */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow><boxGeometry args={[4.2, 2.2, 3.2]} /><meshStandardMaterial color="#B5EACD" /></mesh>
        <mesh position={[0, 2.35, 0]} castShadow><boxGeometry args={[4.5, 0.3, 3.5]} /><meshStandardMaterial color="#10B26C" /></mesh>
        <mesh position={[0, 1.3, 1.62]} rotation={[0, 0, 0]}><torusGeometry args={[0.55, 0.12, 8, 24]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0, 0.55, 1.62]}><boxGeometry args={[1.1, 1.1, 0.05]} /><meshStandardMaterial color="#8DD8B1" /></mesh>
      </group>
      <Building x={9.6} z={-5.5} w={2.4} h={3.2} d={2.4} c="#FFC9B2" />
      <Building x={9.6} z={0} w={2.4} h={4.4} d={2.4} c="#B9DBFA" />
      <Building x={9.6} z={5.5} w={2.4} h={2.8} d={2.4} c="#FFE38A" />
      <Building x={-9.6} z={-5.5} w={2.4} h={3.8} d={2.4} c="#D2C9FF" />
      <Building x={-9.6} z={0} w={2.4} h={2.6} d={2.4} c="#FFE38A" />
      <Building x={-9.6} z={5.5} w={2.4} h={4.2} d={2.4} c="#FFC9B2" />
      <Building x={-5} z={-9.6} w={2.4} h={3} d={2.4} c="#B9DBFA" />
      <Building x={5} z={-9.6} w={2.4} h={4} d={2.4} c="#B5EACD" />
      <Building x={-5} z={9.6} w={2.4} h={3.4} d={2.4} c="#D2C9FF" />
      <Building x={5} z={9.6} w={2.4} h={2.6} d={2.4} c="#FFC9B2" />
      {/* outer ring of buildings and trees so the scene fills a full screen */}
      {([[14, -3, 3, '#B9DBFA'], [14, 4, 4.2, '#FFE38A'], [14, -9, 2.6, '#FFC9B2'], [14, 10, 3.4, '#D2C9FF'], [-14, 3, 3.6, '#FFC9B2'], [-14, -4, 2.8, '#B5EACD'], [-14, 9, 4, '#B9DBFA'], [-14, -10, 3, '#FFE38A'], [3, 14, 3.2, '#D2C9FF'], [-3, 14, 4.4, '#B5EACD'], [9, -14, 2.8, '#FFC9B2'], [-8, -14, 3.6, '#FFE38A'], [8, 14, 3, '#B9DBFA'], [-9, 14, 2.6, '#FFC9B2']] as const).map(([x, z, h, c], i) => <Building key={`o${i}`} x={x} z={z} w={2.4} h={h} d={2.4} c={c} />)}
      {[[17, 0], [-17, 0], [0, 17], [0, -17], [17, 13], [-17, -13], [13, -17], [-13, 17], [12, 12], [-12, -12], [12, -12], [-12, 12]].map(([x, z], i) => <Tree key={`t${i}`} x={x} z={z} s={0.9 + (i % 3) * 0.15} />)}
      {[[-3, -3], [3, -3.2], [-3.2, 3], [3.1, 3], [10.8, 3], [-10.8, -3], [0, 10.8], [0, -10.8]].map(([x, z], i) => <Tree key={i} x={x} z={z} s={0.8 + (i % 3) * 0.12} />)}
    </group>
  )
}

// ---------- actors ----------
// Each truck publishes what the people around it need to know (shared mutable object, no re-renders).
type Info = { t: number; u: number; lane: number; bed: THREE.Vector3 } // t = seconds since the truck stopped (-1 = driving)
const DWELL = 4.4 // stop duration: 0-1.8 people load bags, 1.8-4.2 the bed tips, 4.4 leaves

function uNear(curve: THREE.CatmullRomCurve3, x: number, z: number) {
  let best = 0, bd = Infinity
  for (let i = 0; i < 400; i++) { curve.getPointAt(i / 400, tmp); const d = (tmp.x - x) ** 2 + (tmp.z - z) ** 2; if (d < bd) { bd = d; best = i / 400 } }
  return best
}

function TruckModel({ curve, color, stopU, speed, start, parked, info, all, pace }: { curve: THREE.CatmullRomCurve3; color: string; stopU: number; speed: number; start: number; parked: boolean; info: Info; all: Info[]; pace: number }) {
  const root = useRef<THREE.Group>(null!), bed = useRef<THREE.Group>(null!), wheels = useRef<THREE.Group>(null!), spill = useRef<THREE.Group>(null!)
  const length = useMemo(() => curve.getLength(), [curve])
  const s = useRef({ u: start, dump: -1, spin: 0 })

  useFrame((_, dt0) => {
    const dt = Math.min(dt0, 0.05), st = s.current
    if (!REDUCE && !parked) {
      if (st.dump < 0) {
        const ahead = (((stopU - st.u) % 1) + 1) % 1
        let k = ahead < 0.05 ? Math.max(0.12, ahead / 0.05) : 1
        // queue politely behind another truck in the same lane
        for (const o of all) {
          if (o === info || o.lane !== info.lane) continue
          const gap = (((o.u - st.u) % 1 + 1) % 1) * length
          if (gap < 4.6) k = Math.min(k, Math.max(0, (gap - 3.4) / 1.2))
        }
        const step = (dt * speed * pace * k) / length
        st.u = (st.u + step) % 1; st.spin += (step * length) / 0.32
        if (ahead < 0.004 || ahead > 0.995) st.dump = 0
      } else {
        st.dump += dt
        if (st.dump > DWELL) { st.dump = -1; st.u = (st.u + 0.01) % 1 }
      }
    }
    place(root.current, curve, st.u)
    const t = st.dump
    const tilt = t < 1.8 ? 0 : t < 2.5 ? ease((t - 1.8) / 0.7) : t < 3.4 ? 1 : 1 - ease(Math.min(1, (t - 3.4) / 0.8))
    bed.current.rotation.x = -tilt * 0.72
    spill.current.visible = t > 2.1 && t < 3.7
    if (spill.current.visible) spill.current.children.forEach((c, i) => { const k = Math.min(1, (t - 2.1 - i * 0.12) / 0.7); c.position.set((i - 1) * 0.3, 0.95 - ease(Math.max(0, k)) * 0.65, -1.7 - ease(Math.max(0, k)) * 0.9) })
    wheels.current.children.forEach((w) => { w.rotation.x = st.spin })
    info.t = t; info.u = st.u
    root.current.updateMatrixWorld(); info.bed.set(0, 1.5, -0.4); root.current.localToWorld(info.bed)
  })

  return (
    <group ref={root} scale={1.15}>
      <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.3, 0.3, 3.4]} /><meshStandardMaterial color="#5B6B7C" /></mesh>
      <group ref={wheels}>
        {[[-0.7, 1.0], [0.7, 1.0], [-0.7, -1.0], [0.7, -1.0]].map(([x, z], i) => (
          <group key={i} position={[x, 0.34, z]}><mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.34, 0.34, 0.26, 14]} /><meshStandardMaterial color="#12202B" /></mesh>
            <mesh position={[x > 0 ? 0.14 : -0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.16, 0.16, 0.04, 10]} /><meshStandardMaterial color="#E3ECF5" /></mesh></group>
        ))}
      </group>
      {/* cab with a cute face */}
      <mesh position={[0, 1.15, 1.0]} castShadow><boxGeometry args={[1.25, 1.1, 1.2]} /><meshStandardMaterial color="#FFF7E6" /></mesh>
      <mesh position={[0, 1.4, 1.61]}><boxGeometry args={[1.0, 0.45, 0.04]} /><meshStandardMaterial color="#BFE3FF" /></mesh>
      {[-0.27, 0.27].map((x) => (
        <group key={x}><mesh position={[x, 1.4, 1.66]}><sphereGeometry args={[0.2, 12, 12]} /><meshStandardMaterial color="#fff" /></mesh>
          <mesh position={[x, 1.4, 1.83]}><sphereGeometry args={[0.1, 10, 10]} /><meshStandardMaterial color="#12202B" /></mesh></group>
      ))}
      <mesh position={[0, 0.98, 1.62]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.2, 0.035, 6, 16, Math.PI]} /><meshStandardMaterial color="#12202B" /></mesh>
      {[-0.45, 0.45].map((x) => <mesh key={x} position={[x, 0.78, 1.62]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#FFC83D" emissive="#FFC83D" emissiveIntensity={0.4} /></mesh>)}
      {/* tipping bed (pivot at the rear) */}
      <group ref={bed} position={[0, 0.7, -1.5]}>
        <mesh position={[0, 0.5, 1.15]} castShadow><boxGeometry args={[1.45, 1.0, 2.3]} /><meshStandardMaterial color={color} /></mesh>
        <mesh position={[0, 1.05, 1.15]}><boxGeometry args={[1.5, 0.12, 2.35]} /><meshStandardMaterial color="#fff" opacity={0.35} transparent /></mesh>
        {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.74, 0.55, 1.15]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.3, 0.06, 6, 20]} /><meshStandardMaterial color="#fff" /></mesh>)}
        <mesh position={[0, 1.1, 0.6]}><sphereGeometry args={[0.38, 10, 10]} /><meshStandardMaterial color="#3DBE7A" /></mesh>
        <mesh position={[0.2, 1.05, 1.5]}><sphereGeometry args={[0.32, 10, 10]} /><meshStandardMaterial color="#7ED957" /></mesh>
      </group>
      <group ref={spill} visible={false} position={[0, 0.7, 0]}>
        {[0, 1, 2].map((i) => <mesh key={i}><sphereGeometry args={[0.26, 10, 10]} /><meshStandardMaterial color={i === 1 ? '#7ED957' : '#3DBE7A'} /></mesh>)}
      </group>
    </group>
  )
}

// A person model whose limbs are driven by refs, shared by walkers and the bag runners.
type Body = { root: React.RefObject<THREE.Group>; legL: React.RefObject<THREE.Group>; legR: React.RefObject<THREE.Group>; armL: React.RefObject<THREE.Group>; armR: React.RefObject<THREE.Group>; bag: React.RefObject<THREE.Mesh> }
const useBody = (): Body => ({ root: useRef<THREE.Group>(null!), legL: useRef<THREE.Group>(null!), legR: useRef<THREE.Group>(null!), armL: useRef<THREE.Group>(null!), armR: useRef<THREE.Group>(null!), bag: useRef<THREE.Mesh>(null!) })
const swing = (b: Body, w: number, arm = w) => { b.legL.current.rotation.x = w * 0.6; b.legR.current.rotation.x = -w * 0.6; b.armL.current.rotation.x = -arm * 0.5; b.armR.current.rotation.x = arm * 0.5 }

function Figure({ b, shirt, bag }: { b: Body; shirt: string; bag?: boolean }) {
  const limb = (ref: React.RefObject<THREE.Group>, x: number, y: number, len: number, color: string, extra?: React.ReactNode) => (
    <group ref={ref} position={[x, y, 0]}><mesh position={[0, -len / 2, 0]} castShadow><boxGeometry args={[0.16, len, 0.18]} /><meshStandardMaterial color={color} /></mesh>{extra}</group>
  )
  return (
    <group ref={b.root} scale={1.2}>
      {limb(b.legL, -0.11, 0.55, 0.55, '#2F4B7C')}{limb(b.legR, 0.11, 0.55, 0.55, '#2F4B7C')}
      <mesh position={[0, 0.85, 0]} castShadow><cylinderGeometry args={[0.24, 0.26, 0.55, 10]} /><meshStandardMaterial color={shirt} /></mesh>
      {limb(b.armL, -0.34, 1.08, 0.5, shirt)}
      {limb(b.armR, 0.34, 1.08, 0.5, shirt, bag ? <mesh ref={b.bag} position={[0, -0.6, 0.06]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color="#3DBE7A" /></mesh> : undefined)}
      <mesh position={[0, 1.38, 0]} castShadow><sphereGeometry args={[0.24, 12, 12]} /><meshStandardMaterial color="#FFD9B8" /></mesh>
      <mesh position={[0, 1.5, -0.03]}><sphereGeometry args={[0.25, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#5B3A29" /></mesh>
    </group>
  )
}

function Person({ curve, start, speed, shirt, bag, show }: { curve: THREE.CatmullRomCurve3; start: number; speed: number; shirt: string; bag?: boolean; show: boolean }) {
  const b = useBody()
  const length = useMemo(() => curve.getLength(), [curve])
  const u = useRef(start)
  useFrame((st, dt0) => {
    const dt = Math.min(dt0, 0.05)
    if (!REDUCE) u.current = (u.current + (dt * speed) / length) % 1
    place(b.root.current, curve, u.current)
    b.root.current.visible = show
    const w = REDUCE ? 0 : Math.sin(st.clock.elapsedTime * 7 + start * 30)
    b.root.current.position.y = Math.abs(w) * 0.06
    swing(b, w)
  })
  return <Figure b={b} shirt={shirt} bag={bag} />
}

// Waits beside a truck's stop with a bag; when the truck halts it walks over, tosses the bag into the bed and goes back.
type Stop = { lane: number; at: [number, number]; dir: [number, number]; dH: number; dS: number; start: number; speed: number; color: string; shirt: string }
function Runner({ curve, stop, info }: { curve: THREE.CatmullRomCurve3; stop: Stop; info: Info }) {
  const b = useBody(), flying = useRef<THREE.Mesh>(null!)
  const g = useMemo(() => {
    curve.getPointAt(uNear(curve, stop.at[0], stop.at[1]), tmp)
    const [dx, dz] = stop.dir
    return { H: new THREE.Vector3(tmp.x + dx * stop.dH, 0, tmp.z + dz * stop.dH), S: new THREE.Vector3(tmp.x + dx * stop.dS, 0, tmp.z + dz * stop.dS), toward: Math.atan2(-dx, -dz), away: Math.atan2(dx, dz) }
  }, [curve, stop])
  const hand = useMemo(() => new THREE.Vector3(), [])
  useFrame((st) => {
    const t = REDUCE ? -1 : info.t, r = b.root.current
    let pos = g.H, yaw = g.toward, walking = false, hasBag = t < 1.0, k = 0
    if (t >= 0.2 && t < 0.9) { k = ease((t - 0.2) / 0.7); pos = tmp.copy(g.H).lerp(g.S, k); walking = true }
    else if (t >= 0.9 && t < 1.6) pos = g.S
    else if (t >= 1.6 && t < 2.3) { k = ease((t - 1.6) / 0.7); pos = tmp.copy(g.S).lerp(g.H, k); yaw = g.away; walking = true }
    else if (t >= 2.3) yaw = g.toward
    r.position.set(pos.x, 0, pos.z); r.rotation.y = yaw
    const w = Math.sin(st.clock.elapsedTime * 9)
    if (walking) { r.position.y = Math.abs(w) * 0.06; swing(b, w) } else { swing(b, 0); if (t >= 0.9 && t < 1.6) b.armR.current.rotation.x = -2.4 * Math.sin(((t - 0.9) / 0.7) * Math.PI) }
    if (b.bag.current) b.bag.current.visible = hasBag
    const throwing = t >= 1.0 && t < 1.6
    flying.current.visible = throwing
    if (throwing) {
      const f = (t - 1.0) / 0.6
      hand.set(g.S.x, 1.3, g.S.z).lerp(info.bed, f); hand.y += Math.sin(f * Math.PI) * 1.4
      flying.current.position.copy(hand)
    }
  })
  return (
    <>
      <Figure b={b} shirt={stop.shirt} bag />
      <mesh ref={flying} visible={false}><sphereGeometry args={[0.24, 10, 10]} /><meshStandardMaterial color="#3DBE7A" /></mesh>
    </>
  )
}

function Rig({ onFrame }: { onFrame: () => void }) {
  const { camera, size } = useThree()
  const first = useRef(true)
  useFrame((st) => {
    if (first.current) { first.current = false; onFrame() } // 3D is drawing: drop the placeholder
    const o = camera as THREE.OrthographicCamera
    // landscape: cover the screen; portrait (phones): fit the city across the width
    o.zoom = size.width > size.height ? Math.max(size.width / 44, size.height / 30) : size.width / 24
    const az = Math.PI / 4 + (REDUCE ? 0 : Math.sin(st.clock.elapsedTime * 0.15) * 0.2)
    camera.position.set(Math.sin(az) * 24, 16, Math.cos(az) * 24); camera.lookAt(0, 0.8, 0); o.updateProjectionMatrix()
  })
  return null
}

// 4 trucks: two on the inner lane (stop on the island side) and two on the outer lane (stop beside the pavement).
const STOPS: Stop[] = [
  { lane: 0, at: [0, 4.9], dir: [0, -1], dH: 2.4, dS: 1.45, start: 0.1, speed: 2.3, color: '#3DBE7A', shirt: '#FF7A66' },
  { lane: 0, at: [0, -4.9], dir: [0, 1], dH: 2.4, dS: 1.45, start: 0.6, speed: 2.3, color: '#2F9BFF', shirt: '#7C6CFF' },
  { lane: 1, at: [6.4, 2.75], dir: [1, 0], dH: 2.0, dS: 1.3, start: 0.3, speed: 2.6, color: '#FFB020', shirt: '#2F9BFF' },
  { lane: 1, at: [-6.4, -2.75], dir: [-1, 0], dH: 2.0, dS: 1.3, start: 0.8, speed: 2.6, color: '#FF7A66', shirt: '#10B26C' },
]
const WALKERS: [number, number, number, string, boolean][] = [ // [loop, start, speed, shirt, carries a bag] — alternating pavements
  [0, 0.05, 1.1, '#FF7A66', true],
  [1, 0.1, 1.05, '#2F9BFF', false],
  [0, 0.22, 0.9, '#2F9BFF', false],
  [1, 0.3, 0.95, '#FF7A66', true],
  [0, 0.4, 1.0, '#7C6CFF', false],
  [1, 0.5, 1.15, '#7C6CFF', false],
  [0, 0.58, 1.2, '#FFC83D', true],
  [1, 0.7, 1.0, '#FFC83D', false],
  [0, 0.8, 1.05, '#10B26C', true],
  [1, 0.9, 1.1, '#10B26C', true],
]

// `load` (0..1) = this hour's entries relative to the busiest hour: it sets how many pedestrians are out and how fast trucks roll.
function City({ trucks, load, onFrame }: { trucks: Truck[]; load: number; onFrame: () => void }) {
  const crowd = Math.max(2, Math.round(2 + load * 8))
  const lanes = useMemo(() => [loop(4.9, 1.4), loop(6.4, 1.8, true)], [])
  const walks = useMemo(() => [loop(7.6, 2.25), loop(7.6, 2.25, true)], [])
  const infos = useMemo<Info[]>(() => STOPS.map((s) => ({ t: -1, u: s.start, lane: s.lane, bed: new THREE.Vector3() })), [])
  const stopUs = useMemo(() => STOPS.map((s) => uNear(lanes[s.lane], s.at[0], s.at[1])), [lanes])
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[10, 18, 8]} intensity={1.6} castShadow={!MOBILE} shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} />
      <hemisphereLight args={['#BFE0FF', '#CFEFD9', 0.5]} />
      <World />
      {STOPS.map((s, i) => (
        <TruckModel key={i} curve={lanes[s.lane]} color={s.color} start={s.start} stopU={stopUs[i]} speed={s.speed} pace={0.6 + 0.8 * load} parked={trucks[i]?.status === 'offline'} info={infos[i]} all={infos} />
      ))}
      {STOPS.map((s, i) => <Runner key={i} curve={lanes[s.lane]} stop={s} info={infos[i]} />)}
      {WALKERS.map(([w, u, sp, c, bag], i) => <Person key={i} curve={walks[w]} start={u} speed={sp} shirt={c} bag={bag} show={i < crowd} />)}
      <Rig onFrame={onFrame} />
    </>
  )
}

const hasWebGL = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')) } catch { return false } }

export default function Scene3D({ trucks, load = 0.6 }: { trucks: Truck[]; load?: number }) {
  const ok = useMemo(hasWebGL, [])
  const [ready, setReady] = useState(false)
  if (!ok) return <AdminScene trucks={trucks} /> // static-ish SVG fallback
  return (
    <div className="scene3d" role="img" aria-label="ฉากเมืองจำลอง: รถเก็บขยะวิ่งวนและเทขยะที่ศูนย์รีไซเคิล มีผู้คนเดินอยู่รอบๆ">
      {!ready && <AdminScene trucks={trucks} />}{/* placeholder until the first 3D frame */}
      <Canvas flat orthographic shadows={!MOBILE} dpr={[1, 1.5]} frameloop={REDUCE ? 'demand' : 'always'} camera={{ position: [17, 16, 17], zoom: 20, near: -80, far: 120 }} gl={{ alpha: true, antialias: true }}> 
        <City trucks={trucks} load={load} onFrame={() => setReady(true)} />
      </Canvas>
    </div>
  )
}
