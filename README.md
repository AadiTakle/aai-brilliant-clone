# Pyxel — Learn Python by Doing

### ▶ Live app: **[aai-brilliant-clone.web.app](https://aai-brilliant-clone.web.app)**

[![Live app](https://img.shields.io/badge/Live%20app-aai--brilliant--clone.web.app-2ea44f?style=for-the-badge)](https://aai-brilliant-clone.web.app)

Runs entirely in your browser — no install needed. Sign up and start writing real Python in seconds.

---

**Pyxel is an interactive web app that teaches beginners how to write Python.** Inspired by Brilliant.org's "learn by doing" style, it guides newcomers (roughly 5th–7th graders, but anyone new to coding) from their very first `print()` all the way to writing **FizzBuzzPop** unaided — by writing and running **real Python in the browser**, not by watching videos or reading walls of text.

Every lesson is a short sequence of hands-on steps with **instant feedback**. Learners earn a currency called **Sparks (✦)** and build a daily **streak** as they progress.

## What learners do

Each lesson mixes a few interactive step types, all centered on Python:

- **Concept articles** — bite-sized prose with interactive widgets (loop visualizers, function machines, type sorters, and more) that teach a Python idea by letting you poke at it.
- **Block problems** — Scratch-style drag-and-drop blocks whose labels *are* Python. They compile to real Python and run, so the jump to typed code feels natural. Supports fill-in-the-blank, bug-fix, and free sandbox modes.
- **Python sandboxes** — a full **CodeMirror** code editor where learners write Python and run it. Submissions are graded **LeetCode-style** against hidden **test cases**, with kid-friendly hints on failure.
- **Parsons problems** — reorder (and indent) scrambled lines of Python into a working program.

All Python — both the block-generated code and the code typed in the sandbox — executes **entirely in the browser** via [Pyodide](https://pyodide.org/) (CPython compiled to WebAssembly). There is no backend code execution: grading is deterministic and runs client-side.

## The curriculum

Nine lessons build up the language from first principles, each unlocking the next:

1. **Talking to the Computer** — output and strings (`print`)
2. **Boxes That Remember** — variables
3. **Doing the Math** — arithmetic, the `%` operator, string concatenation
4. **True or False** — booleans and comparisons
5. **Making Decisions** — `if` / `elif` / `else`
6. **Over and Over Again** — loops
7. **Loops and Decisions** — loops + conditionals + accumulators
8. **Build Your Own Machine** — functions (`def` / `return`)
9. **FizzBuzzPop** — the capstone, written unaided

Every Python construct used in the FizzBuzzPop capstone is taught in an earlier lesson — a contract enforced by the test suite.

## Tech stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript
- [Pyodide](https://pyodide.org/) — in-browser Python (WASM) execution and grading
- [CodeMirror](https://codemirror.net/) (`@uiw/react-codemirror` + `@codemirror/lang-python`) — the Python editor
- [`@dnd-kit/core`](https://dndkit.com/) — drag-and-drop for block and Parsons problems
- [Zod](https://zod.dev/) — schema validation for all lesson content
- [Firebase](https://firebase.google.com/) Auth + Cloud Firestore — accounts, progress, points, and streaks
- Firebase Emulator Suite — offline local development
- [Vitest](https://vitest.dev/) — unit, component, Pyodide, and Firestore-rules tests

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables and fill in your Firebase project config:

   ```bash
   cp .env.example .env
   ```

   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/), then add a web app and paste the config values into `.env`.

3. Run the frontend:

   ```bash
   npm run dev
   ```

> The first time a learner reaches a block or Python step, Pyodide downloads and initializes in the browser. This is a one-time per-session cost; it is cached for the rest of the session.

## Local development with emulators

For offline local development without a live Firebase project:

1. Set `VITE_USE_FIREBASE_EMULATORS=true` in `.env`
2. Start emulators and the app together:

   ```bash
   npm run dev:local
   ```

   Emulator UI: http://localhost:4000

   > Requires a JDK (the Firebase emulators run on Java).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run dev:local` | Start Firebase emulators + Vite together |
| `npm run emulators` | Start Firebase emulators only (Auth + Firestore) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite (jsdom unit + component tests) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:pyodide` | Run tests that execute real Python via Pyodide in Node |
| `npm run test:emulator` | Run tests against the Firebase emulators (requires Java) |
| `npm run validate-content` | Validate all lesson content against the Zod schemas |
| `npm run deploy` | Build and deploy hosting + Firestore rules |
| `npm run deploy:hosting` | Build and deploy hosting only |

## Firebase setup

1. Enable **Authentication** (Email/Password).
2. Create a **Firestore** database.
3. Deploy security rules when ready:

   ```bash
   npx firebase deploy --only firestore:rules
   ```

## Learn more

- [`documentation/PRD.md`](documentation/PRD.md) — product vision and requirements.
- [`documentation/ARCHITECTURE.md`](documentation/ARCHITECTURE.md) — a map of the codebase: content model, problem-type registry, block engine, grading, and progress.
