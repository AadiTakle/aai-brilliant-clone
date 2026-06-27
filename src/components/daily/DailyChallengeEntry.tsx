import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../../firebase/config'
import { useAuth } from '../../auth/useAuth'
import { isoDay } from '../../lib/progress/streak'
import { loadTodayChallenge } from '../../lib/daily/store'
import './dailyEntry.css'

// A small, non-intrusive home-page entry into the Daily Challenge. Hidden when
// logged out; once signed in it links to /daily and reflects whether today's
// challenge is already done. The status read is best-effort (errors ignored),
// so it never blocks or breaks the course page if Firestore is unavailable.
export function DailyChallengeEntry() {
  const { user } = useAuth()
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    loadTodayChallenge(db, user.uid, isoDay())
      .then((record) => {
        if (!cancelled) setDone(record != null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return null

  return (
    <Link to="/daily" className="daily-entry" data-done={done ? 'true' : 'false'}>
      <span className="daily-entry-label">
        <span className="daily-entry-eyebrow">Daily Challenge</span>
        <span className="daily-entry-text">
          {done ? 'Done for today — see you tomorrow' : 'A quick spaced-repetition warm-up'}
        </span>
      </span>
      <span className="daily-entry-cta">{done ? 'Review' : 'Start'}</span>
    </Link>
  )
}
