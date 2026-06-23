import { useEffect, useState } from 'react'
import { auth, db } from './firebase/config'
import './App.css'

function App() {
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    setFirebaseReady(Boolean(auth.app.name && db.app.name))
  }, [])

  return (
    <main className="app">
      <header>
        <p className="eyebrow">AAI Brilliant Clone</p>
        <h1>Learn interactively</h1>
        <p className="subtitle">
          Vite + React frontend with Firebase Auth and Firestore backend.
        </p>
      </header>

      <section className="status-card">
        <h2>Firebase status</h2>
        <p>
          {firebaseReady
            ? 'Firebase SDK initialized successfully.'
            : 'Connecting to Firebase...'}
        </p>
        <dl>
          <div>
            <dt>Project</dt>
            <dd>{import.meta.env.VITE_FIREBASE_PROJECT_ID || 'not configured'}</dd>
          </div>
          <div>
            <dt>Emulators</dt>
            <dd>
              {import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'
                ? 'enabled'
                : 'disabled'}
            </dd>
          </div>
        </dl>
      </section>
    </main>
  )
}

export default App
