# Test Suite

Tests are organized by build phase. Each phase folder contains one test file per promised feature, isolated and clearly labeled with a top-level `describe('[Phase n] <feature>')`.

## Layout

```
tests/
  setup.ts                     Shared setup (jest-dom matchers, RTL cleanup)
  helpers/                     Shared test helpers (RTL render, emulator env)
  phase-0-setup/               Harness smoke tests
  phase-1-auth/                Auth & account model
  phase-2-registry/            Problem-type registry, schemas, routing
  phase-3-article/             Article + loop_visualizer
  phase-4-blocks/              Block engine + block problems
  phase-5-python/              Python sandbox
  phase-6-progress/            Progress, points, streak, results
  phase-7-responsive/          Responsive utilities
  manual/                      Manual test instructions for non-scriptable features
```

## Running

| Command | What it runs |
| --- | --- |
| `npm test` | All unit/integration tests that do NOT need the emulator |
| `npm run test:watch` | Same, in watch mode |
| `npm run test:emulator` | Emulator-backed tests (`*.rules.test.ts`, `*.emulator.test.tsx`) inside `firebase emulators:exec` |

## Naming conventions

- `*.test.ts` / `*.test.tsx` — standard unit/integration tests (jsdom).
- `*.rules.test.ts` — Firestore security-rules tests (require emulator).
- `*.emulator.test.ts(x)` — tests that hit Auth/Firestore emulators.

## Manual tests

Features that cannot be reliably scripted (drag-and-drop feel, animations, real-browser Pyodide load, responsive layout across devices) have step-by-step instructions in `tests/manual/`. These must be checked by hand before a phase is considered done.
