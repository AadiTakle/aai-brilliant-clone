import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'

export interface EmulatorApp {
  app: FirebaseApp
  auth: Auth
  db: Firestore
  destroy: () => Promise<void>
}

// Ports match firebase.json (auth: 9099, firestore: 8080).
export function createEmulatorApp(name: string): EmulatorApp {
  const app = initializeApp(
    {
      apiKey: 'test-api-key',
      authDomain: 'localhost',
      projectId: 'aai-brilliant-clone',
    },
    name,
  )
  const auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  const db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8080)

  return {
    app,
    auth,
    db,
    destroy: () => deleteApp(app),
  }
}

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}
