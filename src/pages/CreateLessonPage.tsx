import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../firebase/config'
import { useAuth } from '../auth/useAuth'
import { getGenerator } from '../lib/ai/generator'
import { generateValidatedLesson } from '../lib/ai/generateLesson'
import { CUSTOM_LESSON_COST, canAfford } from '../lib/ai/cost'
import { listCustomLessons, NotEnoughSparksError } from '../lib/aiLessons/store'
import { persistCustomLesson } from '../lib/aiLessons/commit'
import type { CustomLesson } from '../lib/aiLessons/types'
import { CURRENCY_GLYPH, CURRENCY_NAME } from '../components/Currency'

type Status = 'idle' | 'working' | 'refused' | 'error'

export function CreateLessonPage() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [statusLabel, setStatusLabel] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [lessons, setLessons] = useState<CustomLesson[]>([])

  const balance = profile?.totalPoints ?? 0
  const affordable = canAfford(balance)

  useEffect(() => {
    let cancelled = false
    if (!user) return
    listCustomLessons(db, user.uid)
      .then((ls) => {
        if (!cancelled) setLessons(ls)
      })
      .catch((err) => console.warn('Failed to list custom lessons', err))
    return () => {
      cancelled = true
    }
  }, [user])

  const busy = status === 'working'

  async function handleGenerate() {
    if (!user || busy) return
    setMessage(null)
    setErrors([])
    setStatus('working')

    try {
      const outcome = await generateValidatedLesson(getGenerator(), prompt, {
        onAttempt: ({ attempt, isRepair, widgetMode }) => {
          if (widgetMode === 'simple' && !isRepair) {
            setStatusLabel('Using simpler interactives for this topic…')
          } else if (widgetMode === 'simple' && isRepair) {
            setStatusLabel(`Polishing simplified lesson (try ${attempt})…`)
          } else if (isRepair) {
            setStatusLabel(`Fixing lesson details (try ${attempt})…`)
          } else {
            setStatusLabel('Asking the AI to design your lesson…')
          }
        },
      })

      if (outcome.kind === 'refused') {
        setStatus('refused')
        setMessage(outcome.reason)
        return
      }
      if (outcome.kind === 'invalid') {
        setStatus('error')
        setMessage('The generated lesson did not pass our safety checks. Please try a different concept.')
        setErrors(outcome.errors)
        return
      }

      setStatusLabel(`Spending ${CUSTOM_LESSON_COST} ${CURRENCY_NAME} and saving...`)
      const saved = await persistCustomLesson(
        db,
        user.uid,
        outcome.lesson,
        prompt,
        CUSTOM_LESSON_COST,
        outcome.simplifiedWidgets,
      )
      await refreshProfile()
      navigate(`/ai-lessons/${saved.id}`)
    } catch (err) {
      setStatus('error')
      if (err instanceof NotEnoughSparksError) {
        setMessage(`You need ${CUSTOM_LESSON_COST} ${CURRENCY_NAME} to create a lesson.`)
      } else {
        // Callable Functions surface a server-authored message under a
        // `functions/*` code (e.g. the AI service being out of credit or busy).
        // Show that real reason; fall back to a generic line otherwise.
        const code = (err as { code?: string })?.code
        const serverMessage = (err as { message?: string })?.message
        if (typeof code === 'string' && code.startsWith('functions/') && serverMessage) {
          setMessage(serverMessage)
        } else {
          setMessage('Something went wrong while creating your lesson. Please try again.')
        }
        console.warn('Custom lesson generation failed', err)
      }
    } finally {
      setStatusLabel('')
    }
  }

  if (!user) {
    return (
      <main className="create-lesson">
        <p role="alert">Please sign in to create a lesson.</p>
        <Link to="/sign-in">Sign in</Link>
      </main>
    )
  }

  return (
    <main className="create-lesson">
      <header className="create-lesson-head">
        <Link to="/" className="lesson-back-link">
          ← Home
        </Link>
        <h1>Create a lesson with AI</h1>
        <p className="create-lesson-sub">
          Describe one beginner Python idea you want to practice. The AI will build a short custom
          lesson just for you. It can say no to topics that are too big or off-track.
        </p>
        <p className="create-lesson-balance">
          <span aria-hidden="true">{CURRENCY_GLYPH}</span> {balance} {CURRENCY_NAME} &middot; costs{' '}
          {CURRENCY_GLYPH} {CUSTOM_LESSON_COST}
        </p>
      </header>

      <div className="create-lesson-form">
        <label htmlFor="concept">What do you want to learn?</label>
        <textarea
          id="concept"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. How does the % remainder work?"
          rows={3}
          disabled={busy}
        />
        <button
          type="button"
          className="btn-machine"
          onClick={handleGenerate}
          disabled={busy || prompt.trim().length === 0 || !affordable}
          title={!affordable ? `You need ${CUSTOM_LESSON_COST} ${CURRENCY_NAME}` : undefined}
        >
          {busy ? statusLabel || 'Working...' : `Create lesson (${CURRENCY_GLYPH} ${CUSTOM_LESSON_COST})`}
        </button>
        {!affordable && (
          <p className="create-lesson-hint">
            Earn more {CURRENCY_NAME} by completing lessons, then come back to create your own.
          </p>
        )}
      </div>

      {message && (
        <div
          className={`create-lesson-message is-${status}`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          <p>{message}</p>
          {errors.length > 0 && (
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="create-lesson-list">
        <h2>Your custom lessons</h2>
        {lessons.length === 0 ? (
          <p className="create-lesson-empty">You have not made any custom lessons yet.</p>
        ) : (
          <ul>
            {lessons.map((l) => (
              <li key={l.id}>
                <Link to={`/ai-lessons/${l.id}`}>{l.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
