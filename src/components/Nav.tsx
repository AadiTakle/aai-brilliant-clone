import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useTheme } from '../theme/useTheme'
import { AnimatedCurrency } from './AnimatedCurrency'
import { Currency } from './Currency'
import { StreakBadge } from './StreakBadge'
import { StreakModal } from './StreakModal'

export function Nav() {
  const { user, profile, logOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [streakOpen, setStreakOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  // Close the account dropdown on outside-click or Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function handleLogout() {
    setMenuOpen(false)
    await logOut()
    navigate('/', { replace: true })
  }

  return (
    <nav className="nav">
      <Link to="/" className="nav-brand" translate="no">
        Pyxel
      </Link>

      <div className="nav-actions">
        {user && (
          <Link to="/create" className="nav-create" title="Create a lesson with AI">
            + AI lesson
          </Link>
        )}
        {user && (
          <div className="nav-stats">
            <button
              type="button"
              className="streak-button"
              aria-haspopup="dialog"
              aria-expanded={streakOpen}
              onClick={() => setStreakOpen(true)}
            >
              <StreakBadge streak={profile?.currentStreak ?? 0} />
            </button>
            <AnimatedCurrency amount={profile?.totalPoints ?? 0} />
          </div>
        )}
        {user ? (
          <div className="account-menu" ref={accountMenuRef}>
            <button
              type="button"
              className="account-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {user.displayName || 'Account'}
            </button>
            {menuOpen && (
              <div role="menu" className="account-dropdown">
                <p className="account-stat">
                  <Currency amount={profile?.totalPoints ?? 0} /> Sparks
                </p>
                <p className="account-stat">
                  <StreakBadge streak={profile?.currentStreak ?? 0} /> day streak
                </p>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={theme === 'dark'}
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button type="button" role="menuitem" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/sign-in" className="nav-signin">
            Sign in
          </Link>
        )}
      </div>

      <AnimatePresence>
        {streakOpen && (
          <StreakModal
            streak={profile?.currentStreak ?? 0}
            activeDays={profile?.activeDays ?? []}
            lastActiveDate={profile?.lastActiveDate ?? null}
            onClose={() => setStreakOpen(false)}
          />
        )}
      </AnimatePresence>
    </nav>
  )
}
