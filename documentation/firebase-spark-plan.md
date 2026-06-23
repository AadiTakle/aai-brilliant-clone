# Firebase Spark (Free) Plan

Reference for Firebase features available on the **Spark (free) plan**, what is not included, and how to get Auth + Firestore working in this repo.

Sources: [Firebase pricing](https://firebase.google.com/pricing/) and [pricing plans docs](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

---

## Spark plan basics

- **No credit card required** for most features
- **Project-level quotas** — all apps in one Firebase project share limits
- If you exceed a quota on Spark, that product **stops working until the next billing cycle** (daily or monthly, depending on the product)

---

## Fully free on Spark (no usage quotas)

These are included at no cost with no payment method:

| Product | What it does | What you need to do |
| --- | --- | --- |
| **Analytics** | User behavior, funnels, events | Enable in Firebase Console → Analytics. Add the Analytics SDK to your app (or use the modular `firebase/analytics` import). |
| **A/B Testing** | Experiment with Remote Config variants | Enable Analytics first, then A/B Testing in Console. Define experiments tied to Remote Config. |
| **Remote Config** | Change app behavior without redeploying | Enable in Console. Add `firebase/remote-config` SDK, fetch/activate config in your app. |
| **Crashlytics** | Crash reporting | Enable in Console. Add Crashlytics SDK (web support is limited; mainly mobile). |
| **Performance Monitoring** | App performance traces | Enable in Console. Add `firebase/performance` SDK. |
| **Cloud Messaging (FCM)** | Push notifications | Enable in Console. Add `firebase/messaging`, request notification permission, handle service worker (web). |
| **In-App Messaging** | Targeted in-app messages | Enable in Console. Primarily mobile-focused. |
| **App Distribution** | Distribute pre-release builds to testers | Enable in Console. Upload builds via CLI or CI. Mobile-focused. |
| **App Check** | Protect backends from abuse | Enable in Console. Register your app (reCAPTCHA for web). Enforce in Firestore/Functions rules. Subject to attestation-provider quotas. |
| **Gemini in Firebase** | AI help in the Firebase Console | Available in Console for personal Google accounts (Workspace users may need Gemini Code Assist). |

---

## Free on Spark with quotas

These work on Spark up to specific limits:

| Product | Spark limits | What you need to do |
| --- | --- | --- |
| **Authentication** | 50K MAU (email, Google, etc.); SAML/OIDC: 50 MAU | Console → **Build → Authentication** → enable sign-in providers. Use `firebase/auth` in your app. **Phone/SMS auth is Blaze-only.** |
| **Cloud Firestore** | 1 GiB storage; 50K reads/day; 20K writes/day; 20K deletes/day; 10 GiB egress/month | Console → create Firestore DB. Add security rules (`firestore.rules`). Deploy rules: `npx firebase deploy --only firestore:rules`. Use `firebase/firestore` SDK. |
| **Realtime Database** | 1 GB storage; 10 GB/month download; 100 simultaneous connections | Console → create RTDB. Write `database.rules.json`. Use `firebase/database` SDK. **This repo uses Firestore, not RTDB.** |
| **Firebase Hosting** | 10 GB storage; 360 MB/day transfer | `firebase init hosting`, build your app, `firebase deploy --only hosting`. Custom domain + SSL included. |
| **Test Lab** | 10 virtual device tests/day; 5 physical tests/day; 30 min Android streaming/month | Enable in Console. Upload APK/IPA via CLI or Console. Mobile testing only. |
| **Firebase Studio** | 3 workspaces (more with Google Developer Program) | Use [Firebase Studio](https://studio.firebase.google.com/) directly. |
| **BigQuery (sandbox)** | Limited sandbox export from Analytics | Enable Analytics, then set up BigQuery export in Console. |

---

## Not available on Spark (Blaze / pay-as-you-go required)

| Product | Why | What you need |
| --- | --- | --- |
| **Cloud Storage** | **As of Feb 3, 2026**, Storage requires Blaze even for legacy `*.appspot.com` buckets | Upgrade to Blaze (credit card). Blaze still has free Storage quotas before charges. See [Storage FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024). |
| **Cloud Functions** | Not available on Spark at all | Blaze plan + `firebase init functions` + deploy |
| **App Hosting** | Requires billing account | Blaze plan |
| **Phone Authentication (SMS)** | Per-SMS billing | Blaze plan |
| **Phone Number Verification** | Pay-as-you-go | Blaze plan |
| **Firebase ML / AI Logic** | Billed per API usage | Blaze + enable APIs |
| **SQL Connect** | 3-month trial, then Blaze or instance is archived | Blaze for ongoing use |
| **Most GCP IaaS** (Cloud Run, Pub/Sub, etc.) | Not on Spark | Blaze plan |

`.env.example` includes `VITE_FIREBASE_STORAGE_BUCKET`, but **this repo does not use Storage yet** — and Storage would need Blaze if you add it later.

---

## What is already set up in this repo

| Piece | Status |
| --- | --- |
| `firebase` SDK + `firebase-tools` | Installed |
| `src/firebase/config.ts` | Auth + Firestore initialized; emulator support |
| `firebase.json` | Firestore rules + Auth/Firestore emulators |
| `firestore.rules` | Rules for `users`, `courses`, `progress` |
| `.env.example` | Web app config template |
| `.firebaserc` | Default project ID: `aai-brilliant-clone` |

---

## Setup: live Firebase project (Auth + Firestore on Spark)

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com/).
2. **Add a Web app** → copy the config object.
3. **Create `.env`** from the template:

   ```bash
   cp .env.example .env
   ```

   Paste your values into:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET` (optional for now)
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

4. **Enable Authentication** → turn on Email/Password (or Google, etc.).
5. **Create Firestore** → start in **test mode** for quick testing, or production mode and deploy the existing rules.
6. **Link CLI to your project** (update `.firebaserc` if your project ID differs):

   ```bash
   npx firebase login
   npx firebase use --add
   ```

7. **Deploy security rules**:

   ```bash
   npx firebase deploy --only firestore:rules
   ```

8. **Run the app**:

   ```bash
   npm install
   npm run dev
   ```

---

## Setup: local emulators (no Firebase project needed)

1. Set `VITE_USE_FIREBASE_EMULATORS=true` in `.env`.
2. Install **Java** (required by Firebase emulators).
3. Run:

   ```bash
   npm run dev:local
   ```

4. Emulator UI: http://localhost:4000

---

## Quick reference for this learning app

| Feature | Spark free? | Needed for this repo? |
| --- | --- | --- |
| **Auth** | Yes (50K MAU) | **Yes** — core feature |
| **Firestore** | Yes (quotas above) | **Yes** — core feature |
| **Emulators** | Free (local) | **Yes** — already configured |
| **Hosting** | Yes (quotas) | Later, for deployment |
| **Analytics / Remote Config** | Yes | Optional |
| **Storage** | **No (Blaze only)** | Not used yet |
| **Cloud Functions** | **No** | Not used yet |
