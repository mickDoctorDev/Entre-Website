import { Link } from 'react-router-dom'
import { IconLeaf, IconPin, IconUser } from './Icons'

export default function BottomNav({ active }: { active: 'map' | 'wallet' }) {
  return (
    <nav className="nav glass" aria-label="เมนูหลัก">
      <Link to="/wallet" className={`nav-i${active === 'wallet' ? ' on' : ''}`} aria-current={active === 'wallet' ? 'page' : undefined}><IconLeaf /><span>My T</span></Link>
      <Link to="/" className="nav-c" aria-label="แผนที่" aria-current={active === 'map' ? 'page' : undefined}><IconPin /></Link>
      <Link to="/login" className="nav-i"><IconUser /><span>บัญชี</span></Link>
    </nav>
  )
}
