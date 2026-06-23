# Phase 1 — Manual / Environment-Dependent Tests

The automated unit + integration suite (`npm test`) covers validation, the sign-up/sign-in pages, the account menu, the route guard, and the home login gate. The items below either need the Firebase Emulator Suite (which requires a Java runtime not present in the CI sandbox) or are visual/UX checks.

## A. Emulator-backed automated tests (need Java)

These tests are written and ready at:
- `tests/phase-1-auth/auth-service.emulator.test.ts` — sign-up creates an auto-logged-in user + `users/{uid}` profile; duplicate email rejected; sign-in / logout.
- `tests/phase-1-auth/firestore-rules.rules.test.ts` — `users` owner-only, `courses` public-read/no client write, `progress` per-user.

### How to run
1. Install a Java runtime (JDK 11+): `brew install openjdk` (macOS) or equivalent.
2. From the repo root:
   ```bash
   npm run test:emulator
   ```
   This launches the Auth + Firestore emulators via `firebase emulators:exec` and runs the emulator config.
3. Expected: all tests in both files pass.

## B. Visual / UX checks (manual)

Run the app: `npm run dev` (or `npm run dev:local` with emulators + Java).

1. Logged-out home gate
   - Open `/`. The lessons grid is visibly blurred and a "Log in to start learning" panel is shown.
   - Expected: lesson cards are not clickable; "Sign in" and "Create an account" CTAs work.
2. Sign up + auto-login
   - Go to `/sign-up`, enter a parent/guardian email, display name, and matching password (>= 8 chars). Submit.
   - Expected: no second login required; you land on `/` and the lessons are no longer blurred.
3. Session persistence
   - While signed in, reload the page (and reopen the tab).
   - Expected: you remain signed in; the account menu still shows your display name.
4. Account menu
   - Click the account button (shows your display name). A menu with "Logout" appears.
   - Click "Logout".
   - Expected: you return to a logged-out state and the home gate reappears.
5. Duplicate email
   - Try signing up again with the same email.
   - Expected: inline error "That email is already in use…".

## Sign-off
- [ ] A. Emulator tests pass on a machine with Java
- [ ] B1 logged-out gate
- [ ] B2 sign-up auto-login
- [ ] B3 session persistence
- [ ] B4 account menu + logout
- [ ] B5 duplicate email error
