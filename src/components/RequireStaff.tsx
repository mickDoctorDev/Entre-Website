import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

// Only staff/admin may open the ops dashboard. (Writes are protected again by RLS in the database.)
export default function RequireStaff({ children }: { children: ReactNode }) {
  const { user, loading, role } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: '/admin' }} replace />
  if (role === null) return null
  if (role === 'member') return <div className="soon"><p>บัญชีนี้ไม่มีสิทธิ์เข้าหน้าผู้ดูแล</p><Link to="/">← กลับไปแผนที่</Link></div>
  return <>{children}</>
}
