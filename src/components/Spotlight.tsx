import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const KEY = 'login-nudge-until', SESSION = 'login-nudge-shown', DAYS7 = 7 * 864e5

// Dims the screen, cuts a hole around #login-target and points at it. Guests only, once per session.
export default function Spotlight() {
  const { user, loading } = useAuth()
  const [r, setR] = useState<DOMRect | null>(null)
  const ok = useRef<HTMLButtonElement>(null)

  const close = () => { localStorage.setItem(KEY, String(Date.now() + DAYS7)); setR(null) }

  useEffect(() => {
    if (user || loading || sessionStorage.getItem(SESSION) || Number(localStorage.getItem(KEY)) > Date.now()) return
    const t = setTimeout(() => {
      const el = document.getElementById('login-target')
      if (!el) return
      sessionStorage.setItem(SESSION, '1'); setR(el.getBoundingClientRect())
    }, 3000)
    return () => clearTimeout(t)
  }, [user, loading])

  useEffect(() => {
    if (!r) return
    ok.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const re = () => setR(document.getElementById('login-target')?.getBoundingClientRect() ?? null)
    addEventListener('keydown', esc); addEventListener('resize', re)
    return () => { removeEventListener('keydown', esc); removeEventListener('resize', re) }
  }, [!!r])

  if (!r) return null
  const w = Math.min(272, innerWidth - 16), left = Math.min(Math.max(r.right - w, 8), innerWidth - w - 8)
  const pos = { left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 }
  return (
    <div className="spot">
      <div className="spot-back" onClick={close} />
      <div className="spot-ring" style={pos} />
      <Link to="/login" className="spot-hit" style={pos} aria-label="เข้าสู่ระบบ" />
      <div className="spot-tip" role="dialog" aria-modal="true" aria-label="เข้าสู่ระบบเพื่อสะสม T Point" style={{ left, top: r.bottom + 18, width: w }}>
        <i style={{ left: r.left + r.width / 2 - left - 8 }} />
        <p>เข้าสู่ระบบเพื่อสะสม <b>T Point</b> แลกเข้าห้องน้ำฟรี</p>
        <div><Link to="/login" className="btn btn-p">เข้าสู่ระบบ</Link><button ref={ok} className="btn btn-g" onClick={close}>ไว้ทีหลัง</button></div>
      </div>
    </div>
  )
}
