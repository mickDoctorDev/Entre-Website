import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

type S = { code: string; expiresAt: number; truck: string }
const R = 54, C = 2 * Math.PI * R

export default function Entry() {
  const s = useLocation().state as S | null
  const secs = () => (s ? Math.max(0, Math.ceil((s.expiresAt - Date.now()) / 1000)) : 0)
  const [left, setLeft] = useState(secs)
  useEffect(() => { const i = setInterval(() => setLeft(secs()), 250); return () => clearInterval(i) }, [])
  if (!s) return <Navigate to="/" replace />

  const live = left > 10 ? `รหัสเข้าห้องน้ำ ${s.code.split('').join(' ')} ใช้ได้ภายใน 60 วินาที` : left > 0 ? 'เหลือไม่ถึง 10 วินาที' : 'รหัสหมดอายุแล้ว'
  return (
    <div className="app auth entry">
      <div className="auth-card">
        <p className="sub">{s.truck}</p>
        <div className={`ring${left === 0 ? ' dead' : ''}`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r={R} className="ring-bg" />
            <circle cx="60" cy="60" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - left / 60)} />
          </svg>
          <b className="num code">{left > 0 ? s.code : '----'}</b>
        </div>
        <p className="count num">{left > 0 ? `${left} วินาที` : 'หมดอายุแล้ว'}</p>
        <p className="sub">{left > 0 ? 'แสดงรหัสนี้ให้เจ้าหน้าที่ที่รถ' : 'หากยังไม่ได้ใช้ กรุณาติดต่อเจ้าหน้าที่'}</p>
        <span className="sr" role="status">{live}</span>
        <Link to="/" className="btn btn-p wide">กลับไปแผนที่</Link>
      </div>
    </div>
  )
}
