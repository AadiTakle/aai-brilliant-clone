# Codebase Overview (for future AIs)

> A practical map of the **aai-brilliant-clone** repo: what it does, how it is
> structured, and the invariants you must respect when changing it. Read this
> first, then drill into the linked files.
>
> Companion docs: [PRD.md](PRD.md) (product vision), [python-curriculum-spec.md](python-curriculum-spec.md)
> (the 9-lesson curriculum + FizzBuzzPop coverage contract), [firebase-spark-plan.md](firebase-spark-plan.md)
> (free-tier Firebase plan). Manual QA scripts live in `tests/manual/`.

## 1. What this is

A Brilliant.org-style interactive learning web app that teaches **Python from
first principles** to ~5th–7th graders. A lesson is a sequence of small
**interactive steps** (concept articles with hooks/widgets, drag-together block
problems, typed Python sandboxes, and Parsons line-ordering puzzles). Learners
get **instant feedback**, earn a currency called **Sparks (✦)**, and build a
daily **streak**. The arc culminates in writing **FizzBuzzPop** unaided.

Everything is driven by a **content model** (lessons described as data), rendered
by a **problem-type registry**, graded by **pure functions** + an in-browser
Python runtime (**Pyodide**), and persisted to **Firebase** (Auth + Firestore).

## 2. Tech stack

| Concern | Choice |
|---|---|
| UI | React 19 + TypeScript, Vite 8 |
| Routing | react-router-dom v7 (`BrowserRouter`) |
| Backend | Firebase Auth (email/password) + Cloud Firestore |
| Python execution | Pyodide (WASM) — CDN in browser, npm pkg in Node tests |
| Code editor | `@uiw/react-codemirror` + `@codemirror/lang-python` |
| Drag & drop | `@dnd-kit/core` (block problems) |
| Validation | Zod (all content + step configs) |
| Markdown | `react-markdown` (article prose) |
| Tests | Vitest (jsdom unit, Node+Pyodide, Firebase emulator, rules) |

## 3. App shell & request flow

`src/main.tsx` → `src/App.tsx` mounts providers in this order:

```
ThemeProvider → AuthProvider → BrowserRouter → <Nav/> + <AppRoutes/>
```

- [src/app/AppRoutes.tsx](../src/app/AppRoutes.tsx): `/` (the course), `/sign-in`,
  `/sign-up`, `/lessons/:lessonId/step/:stepIndex`, `/lessons/:lessonId/results`.
  Lesson + results routes are wrapped in `RequireAuth`.
- Animations use **Motion** (`motion/react`); the app is wrapped in
  `<MotionConfig reducedMotion="user">` so every animation honors the OS
  reduced-motion setting.

### Home: the Python Basics course
[src/pages/CoursePage.tsx](../src/pages/CoursePage.tsx) is the `/` route. It has
two views, toggled by the `?view=map` search param:

- **Landing** ([CourseCard.tsx](../src/components/course/CourseCard.tsx)): a
  single course card (name, description, lesson-count progress, Get Started).
- **Map** ([CourseMap.tsx](../src/components/course/CourseMap.tsx)): a Duolingo-style
  vertical path of station nodes ([LessonNode.tsx](../src/components/course/LessonNode.tsx),
  each an SVG progress ring), connected by "belts", with a lesson-detail panel
  ([LessonDetail.tsx](../src/components/course/LessonDetail.tsx)) that is a sticky
  sidebar on desktop and a fixed bottom sheet on mobile.

The map is **gated**: it only renders for a signed-in learner, so logged-out
visitors always see the card and Get Started routes them to `/sign-in`.
Per-lesson lock/resume/CTA state and course totals come from
[useCourseProgress.ts](../src/lib/progress/useCourseProgress.ts) (a lesson unlocks
once the previous one is complete). UI-only copy/icons live in
[src/content/course.ts](../src/content/course.ts), separate from the validated
content model.
- [src/auth/AuthProvider.tsx](../src/auth/AuthProvider.tsx) subscribes to
  `onAuthStateChanged`, loads the `users/{uid}` profile, and exposes
  `{ user, profile, loading, signUp, signIn, logOut, refreshProfile }` via
  `useAuth()`.

## 4. Content model (data, not HTML)

A **Lesson** is `{ id, title, version, steps[] }`. Each **Step** is a discriminated
union on `type` with shared base fields `{ id, title?, graded, points, minPoints }`.
Schemas: [src/content/schemas.ts](../src/content/schemas.ts).

Step types (`STEP_TYPES`):

| type | renderer | graded when |
|---|---|---|
| `article` | concept prose + a widget/checkpoint per panel | n/a (completes on interaction) |
| `block_problem` | Scratch-style block workspace → Python | `mode !== 'sandbox' && expectedOutput` set |
| `python_sandbox` | CodeMirror Python editor | `testCases.length > 0` |
| `parsons_problem` | reorder/indent scrambled code lines | always (has a solution) |

Lessons are authored as plain TS objects in
[src/content/lessons/](../src/content/lessons/) and registered (in display
order) in [index.ts](../src/content/lessons/index.ts). The **loader**
([loader.ts](../src/content/loader.ts)) validates raw lessons against
`lessonSchema` (Zod) and caches them; `getLesson`, `listLessons`, `getStep` are
the only sanctioned readers. [validate.ts](../src/content/validate.ts) +
`npm run validate-content` validate the whole catalog.

## 5. Problem-type registry (the extension point)

[src/problem-types/registry.ts](../src/problem-types/registry.ts) maps each step
`type` → `{ component, configSchema }`. [ProblemRenderer.tsx](../src/problem-types/ProblemRenderer.tsx)
looks up the renderer and renders it (or `UnknownStep`). Every step component
receives `StepRenderProps = { step, onComplete?, onGraded? }`
([types.ts](../src/problem-types/types.ts)).

**To add a new step type:** create `schema.ts` + a `*Step.tsx` component, add the
literal to `STEP_TYPES` + the `stepSchema` union in `content/schemas.ts`, and add
one registry entry. (This is exactly how `parsons_problem` was added.)

### Article widgets
Articles are panels; each panel has optional markdown `text` and one `activity`
(a `checkpoint` multiple-choice or a `widget`). Widgets are interactive hooks that
call `onComplete()` when "done"; the panel's Continue button unlocks then.
Branching lives in `ActivityView` inside [ArticleStep.tsx](../src/problem-types/article/ArticleStep.tsx).
Widget configs are strict Zod schemas in [article/schema.ts](../src/problem-types/article/schema.ts),
parsed by each widget component.

Available widgets ([article/widgets/](../src/problem-types/article/widgets/)):
`repeated_addition`, `loop_visualizer`, `function_machine`, `variable_box`,
`value_box`, `type_sorter`, `remainder_machine`, `modulo_picker`,
`multiples_grid`, `comparison_explorer`, `branch_visualizer`, `code_tracer`,
`program_stepper`, `range_machine`, `decision_machine`.

Every widget (and `Checkpoint`) renders inside the shared **`WidgetFrame`**
([WidgetFrame.tsx](../src/problem-types/article/widgets/WidgetFrame.tsx)) "machine
module" chassis: an icon chip + machine name, the bespoke interior, and a
`status: 'idle' | 'running' | 'done'` prop that drives a `READY`/`Running`/`✓
Powered` badge and the green **circuit "energize"** glow on completion. This
shared chassis is what keeps the bespoke widget interiors cohesive when several
are combined in one article. Reduced-motion is read once via the shared
[lib/ui/motion.ts](../src/lib/ui/motion.ts) `useReducedMotion()` helper.

**`function_machine`** ([FunctionMachine.tsx](../src/problem-types/article/widgets/FunctionMachine.tsx))
is a generic, **step-through three-bay machine** used by both L1 (`print`) and L8
(a named `machine`). The learner types a value into the **Input** bay (a quoted,
editable field), then presses **Step**: phase 1 rides the quoted value-token into
the machine's parentheses — `fnName(  )` becomes `fnName("Hi")` and the field goes
read-only — and phase 2 drops the **bare** value (quotes shed) into the dark
**Console**, firing `onComplete()`. A single Motion `layoutId="fm-token"` element
animates slot-to-slot (FLIP); under `prefers-reduced-motion` it simply snaps, and
every phase is still reachable. **Reset** re-arms it. Each phase shows an
`aria-live` commentary line; the schema accepts optional `feedNote`/`emitNote`
overrides (and a `quoted` flag, default true) so L1 and L8 read true, while the
legacy `editable`/`echoInput` flags are still parsed for back-compat.

## 6. Block engine ([src/lib/blocks/](../src/lib/blocks/))

Scratch-style blocks whose labels **are** Python. Two categories:
- **statement** blocks compile to lines via `toCode` (e.g. `for_each`, `print`,
  `assign`, `if_block`/`elif_block`/`else_block`).
- **value** blocks compile to one expression via `toExpr` (e.g. `range_call`,
  `range_n`, `compare`, `binop`, `num`, `str`, `var`).

Slots are `statement` (ordered child list, e.g. a loop body) or `expression`
(exactly one child). An expression slot may declare a `defaultChild` so simple
leaf values (loop var `i`, range bounds, printed text) are **inline-editable**
rather than dragged; slots **without** a default stay empty and act as **drop
zones** for nesting functions/statements. Fields can be `text`/`number`/`select`
(a `select` renders an inline dropdown via the `◇` label placeholder; `⬡` marks
expression slots).

- [definitions.ts](../src/lib/blocks/definitions.ts): `BLOCK_DEFS`, the block
  metamodel, `LOOP_TYPES`/`CONDITIONAL_TYPES`, and the shared `withBody` helper
  that indents a block's body by 4 spaces. Because every nesting block indents
  its own body, `for → if → print` composes to correct cumulative indentation.
- [compiler.ts](../src/lib/blocks/compiler.ts): `compileToSource(nodes)` walks
  the tree; empty expression slots compile to the `__?__` sentinel so unfinished
  programs grade as incorrect.
- [workspace.ts](../src/lib/blocks/workspace.ts): the editor state + reducer
  (`hold`/`place`/`set-field`/`remove`/`reset`); statement slots append, expression
  slots replace.
- [analysis.ts](../src/lib/blocks/analysis.ts): AST detectors `usesLoopNode`,
  `usesConditionalNode`, `usesModuloNode`, and `missingConstructsNode`.

UI: [BlockProblemStep.tsx](../src/problem-types/block_problem/BlockProblemStep.tsx)
(orchestration + dnd validation), `Palette`, `WorkspaceView`, `BlockView`
(renders a block as inline Python with editable leaves + drop zones), `DropZone`.

## 7. Grading ([src/lib/grading/](../src/lib/grading/))

All graders are pure/async and unit-tested without a browser.

- [outputGrader.ts](../src/lib/grading/outputGrader.ts): `normalizeOutput`
  (trim trailing whitespace + outer blank lines) and `gradeOutput`.
- [pythonGrader.ts](../src/lib/grading/pythonGrader.ts): runs source once per
  `testCase` (injecting `stdin`), compares normalized stdout.
- [blockGrader.ts](../src/lib/grading/blockGrader.ts): compiles blocks → runs →
  grades against `expectedOutput`.
- [constructCheck.ts](../src/lib/grading/constructCheck.ts) + [loopCheck.ts](../src/lib/grading/loopCheck.ts):
  "did the learner actually use X?" enforcement. A step may set
  `requiredConstructs: ('loop'|'modulo'|'conditional')[]` (legacy `requireLoop`
  is an alias of `['loop']`). Both source-level (string/comment-safe regex) and
  block-AST detectors exist, so a correct-looking output cannot be faked by
  hardcoding. Missing constructs produce a learner hint (`constructHint`).
- [diagnostics.ts](../src/lib/grading/diagnostics.ts): turns a failed run into a
  kid-friendly hint — missing quote, indentation, `NameError`, missing colon,
  `=` vs `==`, stray `elif`/`else`, type-mismatch comparison, and off-by-one
  heuristics over expected/actual output.
- [parsonsGrader.ts](../src/lib/grading/parsonsGrader.ts): compares ordered line
  ids (and indentation when `checkIndent`).

### Pyodide runner
[src/lib/pyodide/runner.ts](../src/lib/pyodide/runner.ts) lazily loads a **shared**
Pyodide instance (CDN in browser, npm pkg in Node) and exposes `runPython(source,
{ stdin })` returning `{ stdout, error }`. It is the single execution path for
both block problems and the Python sandbox.

## 8. Progress, points & streak ([src/lib/progress/](../src/lib/progress/))

- [model.ts](../src/lib/progress/model.ts): pure reducers. `applyResult` is
  **idempotent** — once a step is `completed`, re-submitting earns nothing. A
  graded wrong answer increments `wrongAttempts` and keeps the step open. A
  lesson is complete once **every graded step** is completed.
- [points.ts](../src/lib/progress/points.ts): linear decay
  `awarded = max(minPoints, basePoints − wrongAttempts × decrement)`, sized so 5
  wrong attempts reach the floor.
- [streak.ts](../src/lib/progress/streak.ts): consecutive local days with a
  completion; a single missed day is forgiven (gap ≤ 2 still increments).
- [store.ts](../src/lib/progress/store.ts): Firestore I/O. Per-step progress is
  saved to `progress/{uid}_{lessonId}`. `commitStepRewards` runs in a transaction
  and updates lifetime `totalPoints` on every completion, but advances the
  **streak / activeDays / completedLessons only when the whole lesson is
  finished**.
- [useLessonProgress.ts](../src/lib/progress/useLessonProgress.ts): React hook
  wiring the reducers to Firestore; used by `LessonPage`.

### Navigation gating
[LessonPage.tsx](../src/pages/LessonPage.tsx): **Next is disabled until the
current step is completed**; Finish (on the last step) is disabled until the
lesson is complete.

## 9. Firestore data model & security

Collections:
- `users/{uid}`: `{ displayName, email, totalPoints, currentStreak,
  lastActiveDate, completedLessons[], activeDays[] }` ([users.ts](../src/lib/users.ts)).
- `progress/{uid}_{lessonId}`: a `LessonProgress` doc.

Rules ([firestore.rules](../firestore.rules)): a user may read/write only their
own `users/{uid}` doc and only `progress` docs whose id is prefixed with their
uid. `courses` are world-readable, never client-writable.

## 10. Theming & gamified UI ([src/theme/](../src/theme/), [src/components/](../src/components/))

- `ThemeProvider`/`useTheme`/`useResolvedTheme`: light/dark toggle persisted to
  `localStorage`, defaulting to system preference; applied via a `data-theme`
  attribute. CodeMirror follows the resolved theme.
- `Nav` shows the animated Sparks total (`AnimatedCurrency` + `useCountUp`) and a
  clickable `StreakBadge` (orange flame when active) opening a `StreakModal` with
  the week's activity. Design tokens live in [src/index.css](../src/index.css);
  component styles in [src/App.css](../src/App.css).

### The Spark Burst + Circuit Energize signature
The lesson experience is built around one repeated gamification flourish: **every
correct answer / finished widget energizes its module (green `circuit-glow` +
`✓ Powered`) and emits a `+N ✦` burst, while the lesson HUD's Sparks readout ticks
up.** The pieces:
- [`SparkBurst`](../src/components/SparkBurst.tsx): the Motion-based `+N ✦` pop
  with gold particles (static fade under reduced motion). To support it,
  `recordStep` ([useLessonProgress.ts](../src/lib/progress/useLessonProgress.ts))
  returns `{ pointsDelta, justCompleted, lessonComplete }`.
- [`LessonPage`](../src/pages/LessonPage.tsx): a **control-panel HUD** (lesson icon
  + number from [content/course.ts](../src/content/course.ts), a segmented
  [`StepGauge`](../src/components/StepGauge.tsx), and a live "Sparks this lesson"
  count-up that fires a `SparkBurst` on each earn), plus machine-styled nav.
- [`ResultsPage`](../src/pages/ResultsPage.tsx): a "machine complete" payoff with a
  big animated Sparks count-up, a bounded `spark-shower`, the streak badge, and a
  strong Next-lesson / Back-to-course CTA.
- Shared CSS in [src/App.css](../src/App.css): `.is-energized`, the upgraded
  `.feedback-correct/.feedback-incorrect` system, `.btn-machine`/`.btn-ghost`, and
  the `WidgetFrame` chassis — all gated by `prefers-reduced-motion`.

The `.feedback-incorrect` shake is a CSS **entry** animation, so a repeated wrong
answer would otherwise stay statically mounted (no replay — the learner can't tell
a dead button from a fresh wrong answer). Each graded surface therefore bumps a
per-attempt counter on submit and uses it as the React `key` on the
`feedback-incorrect` element, remounting it so the shake replays every time:
Checkpoint, `BlockProblemStep`, `PythonSandboxStep`, `ParsonsProblemStep`, and the
`TypeSorter` widget.

## 11. The curriculum & the coverage contract

Nine lessons, registered in order in [lessons/index.ts](../src/content/lessons/index.ts):
L1 output/strings → L2 variables → L3 math/`%`/concat → L4 booleans/comparisons →
L5 if/elif/else (+ Parsons) → L6 loops (`l6-over-and-over-again`, refit) → L7
loops+ifs+accumulator → L8 functions (`def`/`return`) → **L9 FizzBuzzPop** capstone.

The **contract**: every construct in the FizzBuzzPop reference solution is taught
before L9. This is enforced by
[tests/phase-9-curriculum/capstone-coverage.test.ts](../tests/phase-9-curriculum/capstone-coverage.test.ts),
which maps each matrix row to the lesson that introduces it (fails if a lesson is
renamed/removed or a teaching block is dropped). The reference solution lives in
[tests/phase-9-curriculum/fixtures.ts](../tests/phase-9-curriculum/fixtures.ts).
Full detail in [python-curriculum-spec.md](python-curriculum-spec.md).

## 12. Firebase config & environment

[src/firebase/config.ts](../src/firebase/config.ts) reads `VITE_FIREBASE_*` env
vars and, when `VITE_USE_FIREBASE_EMULATORS === 'true'`, connects to local Auth
(9099) and Firestore (8080). `firebase.json` defines emulator ports + UI (4000),
single-project mode; project id is `aai-brilliant-clone` (`.firebaserc`). The
`npm run emulators` script does **not** import/export, so emulator data is
in-memory (restart = clean slate).

## 13. Testing

Tests are grouped by build phase under `tests/phase-*`. Configs:
- `npm test` — Vitest, jsdom env, unit + component tests (~185 tests).
- `npm run test:pyodide` — `*.pyodide.test.ts`, real Python in Node.
- `npm run test:emulator` — `*.emulator.test.ts` under the Firebase emulator
  (needs a JDK; not run in environments without Java).
- `*.rules.test.ts` — Firestore security-rules tests.
- `tests/manual/phase-*.md` — human QA scripts.

Full local gate: `tsc -b` (or `npm run build`), `npm run lint`, `npm test`,
`npm run test:pyodide`, and (with Java) `npm run test:emulator`.

## 14. Invariants & gotchas (don't regress these)

- **Empty string is meaningful.** The `str` block must compile `""` to `""`. The
  shared `field()` fallback treats `''` as missing, so `str.toExpr` special-cases
  it. Critical for `label = ""` (FizzBuzzPop).
- **Construct enforcement** is what makes graded steps honest — keep
  `requiredConstructs` wired into both graders; `requireLoop` is a back-compat
  alias.
- **`applyResult` is idempotent**; never award points twice for a completed step.
- **Streak advances only on full lesson completion**, not per step.
- **Output comparison is normalized** (`normalizeOutput`) — trailing whitespace
  and outer blank lines don't matter; interior lines do.
- **Lessons are data**: prefer authoring/editing lesson TS objects + schemas over
  hardcoding UI. Run `npm run validate-content` after content changes.
- **Adding a step type or widget** means touching the registry/enum/schema in the
  small set of places listed in §5 — the renderer is generic.
