# Alpha AI Brilliant.org Clone App - Python Programming
## Product Requirements Document

### MVP

**MVP scope:** a single lesson, *Over and Over Again*. The data model supports courses with multiple lessons, but only this lesson is authored and seeded for the MVP.

#### Proposed Pages

- Home Page

Will have a lessons page that shows ongoing lessons, where the user is in the lesson, and the total steps/problems before the lesson is finished. Lesson content is public at the data layer, but playing a lesson requires sign-in (progress is per-user); the lessons area is blurred with a prompt to log in until authenticated.
Account icon in nav bar that, when clicked, shows the user's display name and a Logout action (MVP scope: display name + Logout).

- Sign In Page

Basic Auth page with Email and Password fields and a CTA to Sign Up
Nice-to-Have: Forgot password, 2FA
Reroutes to Home Page on Success

- Sign Up Page

Email, Name, Password, Confirm Password (fails if email is taken)
On success, the user is automatically signed in and redirected to the Home Page.

---

Lesson Pages

- Lesson Article page

Lesson type that is mostly text. This will explain features and have interactive elements built in like code blocks and small activities.

- Block Problem Page

A page with a problem several preset blocks that contain a line (or block) of python code that can be dragged into place. Can be done in a fill in the blank, bugfix, and sandbox style.

- Python sandbox

Provide a problem/ question and ask the user to write a python script to handle this problem. May test against some test cases leetcode style and give feedback on failure based on the test cases failed. Will provide a basic outline (i.e. main function & maybe a loop structure to edit)

- Results page at end of lesson.

Shows all of the problems completed (with check marks that fill in on opening the page!) and allows the user to go back to any completed lesson (which will load the page associated)

#### Lesson Structure

**Lesson Name: Over and Over Again**

Here is how the lesson will be organized:

1. **Discover loops by doing (interaction-led, minimal text).** Replace the text-heavy intro with a short interactive sequence that teaches a loop as *repeated action*. This keeps the same critical introduction (what a loop is, repetition, and a for-vs-while preview) but delivers it Brilliant-style: do first, read little. May be implemented as one or two micro-steps:
    - **Repeated addition hook:** Show `5 × 3` and frame multiplication as repeated addition. The learner taps an "add 5" button and watches a counter (times added) and a running total update. After reaching 15 by hand, the widget collapses the taps into an animated loop ("repeat 3 times: add 5"), revealing that a loop automates repetition. Prose is limited to a line or two; the concept emerges from the action. A quick checkpoint ("how many times did we add 5?") gives instant feedback.
    - **Anatomy of a loop (`loop_visualizer`):** An animated loop steps through iterations with a visible counter/variable and running total. The learner sets the repeat count (stepper/drag) to hit a target like `5 × 4 = 20` and gets instant feedback. A light teaser distinguishes loops that repeat a set number of times (for) from loops that repeat until a condition changes (while); the detailed contrast is taught through the block steps that follow rather than as upfront text.
2. Move to a block coding example. This will be a sandbox that is already configured to loop over the numbers one through ten and print them to console. The blocks should be scratch style, with each one representing a command (print, for loop, while loop, etc.)
3. Next, the user will be given a fill in the blank problem where the for loop in field from the previous problem is now empty. The user can drag a range block into the empty slot and put the number 10 in. 
    Nice-to-Have: On success, the user should be challenged to find another valid solution to the problem (swapping the for loop for a while loop block)
4. Then, a bug fix problem, where a while loop is being used but the index is not being updated at the end of the loop.
5. The last block based problem will be a sandbox problem where the user is tasked with creating a multiplication system using only addition (they should employ a loop to repeatedly add a number. Input handling will be handled by the program already and not needed to be added)
6. Now the user will move to an actual python programming environment. Starting with a fully created loop scenario to teach the user how to run python in the environment and how for and while loops work.
7. A fill in the blank problem that is similar (but not identical!) to the block problem but now in pure python
8. A bugfix problem similar to the block problem (but not identical!) but now in pure python
9. A sandbox problem that tasks the user to create a exponent function (with a small explanation of what an exponent means) using python, for loops, and while loops.

#### Important Features

**Content model**

- Lessons are a ordered sequence of typed steps (`article`, `block_problem`, `python_sandbox`, `results`) — structured JSON with `type` + `config`, not HTML blobs
- Steps map to pedagogical roles: **concept** (`article`), **problem** (`block_problem`, `python_sandbox`), **feedback** (grader output + per-step hints/success/error messages in `config`)
- Shared primitives (block library, article widgets) referenced by step config for reuse across lessons
- Zod-validated schemas at build time so content is safe to author by hand or generate later (e.g. AI)

**Frontend (step runtime)**

- `ProblemRenderer` loads step content and renders the correct interactive UI per type
- Captures learner interactions per step (`lastSubmission`: block graph, code, etc.)
- Instant feedback driven by the content model — graders compare submission against `config` (accepted solutions, test cases, constraints); feedback text comes from step config, not hardcoded UI

**Progress and mastery**

- Per-lesson progress: current step index, per-step status (`not_started` | `in_progress` | `completed`), attempt count, completion timestamp
- Record whether each attempt was correct or incorrect, not just completion
- Resume in-progress lessons at the last incomplete step
- Home page shows lesson list with progress (steps completed / total) for logged-in users
- Linear "what's next" for MVP: must answer a step correctly to advance; completed steps can be revisited read-only; non-graded exploration steps advance on Run/Next. Results page at lesson end
- Each problem can surface hints from its step `config`. No full-solution reveal in MVP. Feedback text (success / error / hint) is content-driven, not hardcoded
- Nice-to-Have: skill/topic tags per step, mastery scores, and adaptive sequencing within the course

**Persistence (cross-session)**

- Firebase Auth — identity survives across sessions and devices
- Firestore `progress/{userId}_{lessonId}` — lesson progress and per-step outcomes
- Firestore `users/{userId}` — profile (name, email) and aggregate stats
- Lesson completion history (which lessons finished, when)
- Daily activity streaks (consecutive days with at least one completed step)
- Progress requires sign-in; lesson content is readable without auth

#### Architecture

**Fit against minimum architecture**

| Requirement | Status | Notes |
| --- | --- | --- |
| Content model (structured steps, not HTML) | **Satisfied** | Step `type` + `config`; validators enable fast authoring and future AI generation |
| Frontend (render, capture, instant feedback) | **Satisfied** | Registry + graders; feedback driven by step `config` |
| Progress and mastery layer | **Partial** | Progress per step is defined; mastery/adaptive "what's next" deferred to Nice-to-Have (MVP uses linear sequencing) |
| Persistence (progress, streaks, history) | **Partial** | Firestore progress + auth planned; streaks and completion history called out in Important Features above |

**Core principle:** Lessons are ordered data (steps), not bespoke pages. Each step has a `type` and `config`. A single router renders any step via a problem-type registry.

**Layers**

| Layer | Responsibility | Storage |
| --- | --- | --- |
| **Content** | Lessons, steps, shared primitives (blocks, widgets) | Repo JSON (source of truth); optionally synced to Firestore `courses/...` |
| **Runtime** | `ProblemRenderer` dispatches `type` → React component | Code (`src/problem-types/`) |
| **Grading** | Pure functions: config + submission → pass/fail + feedback | Code (`src/lib/grading/`) |
| **Progress** | Per-user step status, attempts, last submission | Firestore `progress/{userId}_{lessonId}` |

**Problem type registry**

Each type is a self-contained plugin: Zod schema + UI component + optional grader. Adding a new interface = one new plugin + registry entry — no changes to lesson routing, home page, or progress schema.

```
ProblemRenderer → registry[step.type] → Component + grader
```

**MVP problem types**

| Type | Modes / notes |
| --- | --- |
| `article` | Markdown + reusable interactive widgets |
| `block_problem` | `sandbox`, `fill_blank`, `bugfix` — shared block palette. Graded by the generated code's output when executed. Pure-exploration sandboxes (e.g., step 2) are not graded — they complete on Run/Next and award full points |
| `python_sandbox` | Starter code + test cases; graded client-side (Pyodide) by comparing stdout to expected output per test case. Inputs are supplied as predefined stdin per test case (no interactive `input()` prompts). Intro/run-only steps (e.g., step 6) are not graded |
| `results` | Reads from progress; shows completed steps |

**Reusability**

- **Block library** — shared definitions (`print`, `for_loop`, `while_loop`, `range`, etc.) referenced by block problems
- **Article widgets** — composable demos (`loop_visualizer`, etc.) without new page types
- **Per-scenario customization** — same type, different `config` (e.g. step 3 fill-blank vs step 4 bugfix)

**Lesson routing**

Generic URL: `/lessons/:lessonId/step/:stepIndex`. Router loads step data and passes it to `ProblemRenderer` — it does not branch on lesson ID or page type.

**Progress shape (type-agnostic)**

```typescript
{
  lessonVersion,
  currentStepIndex,
  steps: {
    [stepId]: {
      status,
      attempts,
      lastCorrect?: boolean,
      completedAt?,
      lastSubmission?
    }
  }
}
```

Each plugin interprets `lastSubmission` for its own type (block graph, code string, etc.).

**Versioning**

- Bump `lesson.version` when content changes; in-progress users stay on the version they started
- Bump step/type version when a problem interface changes; optional config migration per plugin

**Content validation**

All lesson JSON validated at build time (Zod). Unknown `type` or invalid `config` fails CI before deploy.

**Adding a new problem type later**

1. Add `schema.ts`, `Component.tsx`, `grader.ts` under `src/problem-types/{type}/`
2. Register in problem type registry
3. Reference in any lesson step JSON — no other code changes required

**Anti-patterns to avoid**

- One React page per problem or lesson
- Grading logic inside components
- Storing rendered HTML in Firestore
- Hardcoding lesson-specific routes or conditionals

#### Gamification Elements
Points are awarded on completing a step. Each step defines a `basePoints` and `minPoints`. Points are awarded on step completion using a linear decay: `awarded = max(minPoints, basePoints − wrongAttempts × decrement)`, where `decrement` defaults so that 5 wrong attempts reaches `minPoints` (i.e., `decrement = (basePoints − minPoints) / 5`). A first-try correct answer earns the full `basePoints`. Non-graded exploration steps award full `basePoints`.

Per-step points sum into a lifetime total score shown in the nav bar / account menu; the results page shows points earned for that lesson.

A Progress Bar should be displayed on the lesson if it has not been completed. This should be displayed in the Nav Bar if currently in the lesson and as part of the lesson card when on the home screen.

Nice-To-Have: Streaks and Milestones that award points on lesson completion and step completions

Dream: A robust acheivement system that tracks specific goals/milestones but is not lesson specific (i.e. can be done on any lesson)

### User Persona
Students between the 5th and 7th grade who are interested in learning and beginning their programming journey. Their experience with programming ranges from none at all to having played with block coding programs such as scratch or hour of code. Their hope by the end of the series of lessons on Python programming is to be able to write a basic script and have it execute from start to end without any bugs.

### User Story
A 6th grader with no coding experience opens the site and is sent to the Home Page. Seeing that the lessons area is blurred and requires a login, they create an account by clicking on the sign in button, the sign up button on the sign in page, and create an account. Once signed up, they are automatically signed in and returned to the Home Page. They click on the Over and Over Again lesson and are sent to the first lesson in the series. Working through the lesson, they ace the first step and get full points for it. The second step is a block problem, where the user is able to manipulate the blocks, their order, and the components within some of the more complex blocks using their mouse and dragging. The blocks very clearly represent lines of python code that the user is slowly learning. Then, they make a small mistake on the second question, but thinking on the problem a bit more, they are able to independently solve the issue and get the answer, rewarding fewer points, but still more than the minimum. Then, on the third problem, they struggle a lot, getting it wrong several times in a row. After they have answered incorrectly 5 times, the points have reached the minimum amount they can award and once they complete the step, they are awarded the minimum. Now, having worked out their confusion using the interactive elements in the previous steps, they ace the rest of the block problem steps, getting the maximum points in every step. On the next step, they enter a freeform Python environment, which is familiar since the sandbox script is the exact same as the sandbox block script, but now in actual python. The user is able to solve the problems since they have experience from the block coding examples and aces all of the remaining steps. At the end of the lesson, the user gains a 1 day streak and is returned to the home page where the lesson is marked as complete and the progress bar for the lesson is completely filled.

### Tech Stack

**Frontend (in repo)**

| Technology | Role |
| --- | --- |
| [React 19](https://react.dev/) | UI components, step runtime, problem-type plugins |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe app code, content schemas, graders |
| [Vite 8](https://vite.dev/) | Dev server, bundling, production builds |
| CSS (global + component styles) | Layout and styling for MVP |

**Frontend (planned for MVP)**

| Technology | Role |
| --- | --- |
| [React Router](https://reactrouter.com/) | Client-side routing (`/`, `/sign-in`, `/lessons/:lessonId/step/:stepIndex`) |
| [Zod](https://zod.dev/) | Validate lesson/step JSON at build time |
| Markdown renderer (e.g. `react-markdown`) | Render article step content |
| Drag-and-drop library (e.g. `@dnd-kit`) | Block problem interactions; uses pointer/touch sensors with a tap-to-place fallback for touch devices |
| [CodeMirror 6](https://codemirror.net/) | Touch-friendly code editor for `python_sandbox` steps |
| [Pyodide](https://pyodide.org/) | Run learner Python in-browser for `python_sandbox` steps (no backend required on Spark) |

**Backend & persistence**

| Technology | Role |
| --- | --- |
| [Firebase Auth](https://firebase.google.com/docs/auth) | Email/password sign-up and sign-in |
| [Cloud Firestore](https://firebase.google.com/docs/firestore) | User profiles, lesson progress, completion history, streaks |
| [Firebase Hosting](https://firebase.google.com/docs/hosting) | Deploy static frontend (Spark free tier) |
| [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite) | Local Auth + Firestore for offline dev (`npm run dev:local`) |

**Content & tooling**

| Technology | Role |
| --- | --- |
| JSON lesson files in repo (`src/content/`) | Source of truth for courses, lessons, and steps |
| `firebase-tools` CLI | Deploy Firestore rules, emulators, hosting |
| ESLint + TypeScript ESLint | Linting |
| npm | Package management |

**Hosting & billing**

- **Firebase Spark (free) plan** for MVP — Auth, Firestore, Hosting, and emulators within free quotas
- Python execution stays **client-side (Pyodide)** to avoid Cloud Functions (Blaze-only on Spark)
- Cloud Storage not required for MVP but may be added later down the line

**Local development**

```bash
npm install
cp .env.example .env   # Firebase web app config
npm run dev            # Vite only (live Firebase)
npm run dev:local      # Vite + Auth/Firestore emulators (requires Java)
npm run build          # Type-check + production bundle
```

**Deployment (planned)**

1. `npm run build`
2. `firebase deploy --only hosting,firestore:rules`

### Responsive & Mobile

The app must deliver full functionality on both desktop and mobile (the persona's 5th-7th graders often use phones, tablets, and Chromebooks). Mobile is not a cut-down view — every problem type is fully playable on touch.

**Layout**

- Mobile-first responsive CSS with breakpoints (phone < 640px, tablet 640-1024px, desktop > 1024px).
- Lesson cards stack vertically; nav collapses to a compact bar with the progress bar and an account menu (hamburger/sheet).
- Large, finger-friendly touch targets (min 44×44px) suited to younger users.

**Block problems on touch**

- Drag-and-drop via `@dnd-kit` pointer/touch sensors.
- Tap-to-place fallback: tap a palette block, then tap a slot — so dragging is never required.
- Editable block fields (e.g., the `range` number) use native mobile inputs.

**Python sandbox on mobile**

- CodeMirror 6 editor tuned for touch (larger font, no hover-only affordances).
- Pyodide runs fully in-browser on mobile; note the larger initial download/memory cost — show a loading state and lazy-load Pyodide only on python steps.
- A simple toolbar for common symbols (`:`, `()`, indentation) to ease coding on mobile keyboards.

**Results & navigation**

- Results page and progress bar adapt to narrow widths.
- Step navigation works with swipe/tap; revisiting completed steps is read-only.

**Testing**

- Verify each problem type on at least one phone, one tablet, and desktop viewport before a lesson ships.

### MVP Extensions (Planned Enhancements)

These refine the experience toward Brilliant's "learn by doing" philosophy. They are not required for the initial MVP build but are the priority enhancements immediately after it.

- **Stuck-learner escape hatch:** After a configurable number of failed attempts (default 5, i.e., once points reach `minPoints`), offer a "Show solution / Walk me through it" option. Revealing forfeits remaining points but lets the learner see the worked answer and continue, avoiding dead-ends. Aligns with Brilliant's emphasis on the aha moment over gatekeeping.
- **Misconception-specific feedback:** Make per-error feedback a first-class part of block-problem `config`. Instead of a generic "try again," map common wrong arrangements/values to targeted hints (e.g., "your loop never updates the index, so it runs forever"). The Python grader already gives per-test-case feedback; this brings block problems to parity.
- **Accessibility (a11y):** Color-contrast-safe palette, full keyboard navigation, and screen-reader support. Drag-and-drop must have an accessible equivalent (the tap-to-place fallback doubles as a keyboard/assistive-tech path). Important for a children's education product.
- **Pyodide performance budget:** Treat in-browser Python load as a real acceptance criterion on low-end phones/Chromebooks (the target hardware). Lazy-load Pyodide only on python steps, show a loading state, cache it across steps, and define a fallback/perf budget (e.g., usable on a mid-range Chromebook within a set number of seconds).
- **Robust empty/error states:** Handle Pyodide load failure, network loss mid-lesson, and runaway user code (an execution timeout to catch infinite loops) with clear, kid-friendly messaging.
- **Learning analytics/telemetry:** Capture per-step drop-off and attempt data (the progress model already stores most of this) to iterate on lesson difficulty the way Brilliant does — including watching whether the points-decay model discourages guessing.
