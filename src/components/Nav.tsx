import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function Nav() {
  const { user, profile, logOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    setMenuOpen(false)
    await logOut()
    navigate('/', { replace: true })
  }

  return (
    <nav className="nav">
      <Link to="/" className="nav-brand">
        Pyxel
      </Link>

      <div className="nav-actions">
        {user && (
          <span className="nav-points" title="Total points">
            {profile?.totalPoints ?? 0} pts
          </span>
        )}
        {user ? (
          <div className="account-menu">
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
                <p className="account-stat">{profile?.totalPoints ?? 0} total points</p>
                <p className="account-stat">{profile?.currentStreak ?? 0}-day streak</p>
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
    </nav>
  )
}
