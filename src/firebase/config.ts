import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)

// App Check protects the callable (and Firestore, when enforced) from abuse so
// AI generation cannot be hammered by anonymous traffic. Only initialized when a
// reCAPTCHA v3 site key is configured and we are in a real browser (skipped in
// tests / SSR). The OpenAI key itself lives only in the Cloud Function secret.
const appCheckKey = import.meta.env.VITE_FIREBASE_APPCHECK_KEY
if (appCheckKey && typeof document !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckKey),
    isTokenAutoRefreshEnabled: true,
  })
}

const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

if (
  useEmulators &&
  !(globalThis as { __FIREBASE_EMULATORS_CONNECTED__?: boolean }).__FIREBASE_EMULATORS_CONNECTED__
) {
  ;(globalThis as { __FIREBASE_EMULATORS_CONNECTED__?: boolean }).__FIREBASE_EMULATORS_CONNECTED__ = true

  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}
