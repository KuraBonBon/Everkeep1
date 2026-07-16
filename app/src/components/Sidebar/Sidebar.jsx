import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HiOutlineViewGrid,
  HiOutlinePencilAlt,
  HiOutlineArchive,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineCog,
  HiOutlineAcademicCap,
  HiOutlineCash,
  HiOutlineChatAlt2,
} from 'react-icons/hi'
import useProfileStore from '../../stores/useProfileStore'
import './Sidebar.css'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
  { path: '/journal', label: 'Reflection Journal', icon: HiOutlinePencilAlt },
  { path: '/artifacts', label: 'Artifact Vault', icon: HiOutlineArchive },
  { path: '/timeline', label: 'Milestone Timeline', icon: HiOutlineClock },
  { path: '/insights', label: 'AI Insights', icon: HiOutlineSparkles },
  { path: '/finance', label: 'Finance', icon: HiOutlineCash },
  { path: '/assistant', label: 'AI Assistant', icon: HiOutlineChatAlt2 },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog },
]

export default function Sidebar() {
  const location = useLocation()
  const fullName = useProfileStore((s) => s.fullName)
  const avatarInitials = useProfileStore((s) => s.avatarInitials)
  const role = useProfileStore((s) => s.role)
  const program = useProfileStore((s) => s.program)
  const yearLevel = useProfileStore((s) => s.yearLevel)
  const position = useProfileStore((s) => s.position)
  const department = useProfileStore((s) => s.department)
  const previousProgram = useProfileStore((s) => s.previousProgram)

  /* Role-adaptive subtitle */
  const subtitle = role === 'Student'
    ? `${program || 'Student'} — ${yearLevel || ''}`
    : role === 'Alumni'
      ? previousProgram || 'Alumni'
      : role === 'Faculty' || role === 'Staff'
        ? position || department || role
        : department || role

  return (
    <motion.aside
      className="sidebar"
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Brand */}
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <HiOutlineAcademicCap size={28} />
        </div>
        <h1 className="sidebar__brand-text">Everkeep</h1>
      </div>

      {/* Navigation */}
      <nav className="sidebar__nav">
        <div className="sidebar__nav-label">MENU</div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
            >
              {isActive && (
                <motion.div
                  className="sidebar__link-bg"
                  layoutId="activeNav"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon size={20} className="sidebar__link-icon" />
              <span className="sidebar__link-label">{item.label}</span>
              {isActive && <div className="sidebar__link-indicator" />}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom user area */}
      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">{avatarInitials}</div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{fullName}</span>
            <span className="sidebar__user-role">{subtitle}</span>
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
