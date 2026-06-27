# Learning Science in Pyxel

> **Purpose.** This report audits how learning-science principles are actually
> implemented in Pyxel (the "learn Python by doing" Brilliant.org clone), what
> each technique is intended to do for the learner, and — crucially — how its
> impact and effectiveness can be *measured* given the data the app already
> captures (and what would need to be added).
>
> It covers the six techniques the team called out (retrieval practice, spaced
> repetition, interleaving, mastery learning, scaffolding / desirable difficulty,
> immediate explanatory feedback) plus several other established principles the
> codebase implements (worked examples, concreteness fading, the generation
> effect, dual coding, cognitive-load management, metacognitive prediction,
> learning-from-errors, curriculum coherence, and gamified motivation).
>
> Every claim is grounded in a file path so it can be verified and re-audited.
> Companion docs: [`PRD.md`](PRD.md), [`ARCHITECTURE.md`](ARCHITECTURE.md),
> [`brilliant_lesson_rehaul.md`](brilliant_lesson_rehaul.md).

---

## 0. How to read this report

Each technique section has the same four parts:

1. **Principle** — the learning-science idea in one or two sentences.
2. **How Pyxel implements it** — concrete code, with file references.
3. **Impact on learners** — the intended cognitive/behavioral effect.
4. **How to measure it** — the metric(s), what data exists *today*, and what
   instrumentation is missing.

A status tag summarizes maturity:

- **Implemented** — a deliberate, working mechanism exists.
- **Partial** — present but limited in scope or not fully wired through.
- **Not implemented** — searched for and genuinely absent today.

---

## 1. Executive summary

| # | Technique | Status | Where it lives |
|---|-----------|--------|----------------|
| 1 | **Retrieval practice** | Implemented | Mastery Recall MCQs, article checkpoints, Apply coding (`src/content/mastery/`, `src/problem-types/article/Checkpoint.tsx`) |
| 2 | **Spaced repetition** | **Not implemented** | No scheduler/intervals anywhere; only *within-session* re-targeting of missed concepts |
| 3 | **Interleaving** | Partial | Step **formats** mixed within a lesson; concept practice is mostly blocked (`src/content/lessons/*`, `MasteryProgress.tsx`) |
| 4 | **Mastery learning** | Implemented (binary) | Two-phase Mastery Challenge, `masteredLessons`, prerequisite-coverage contract (`src/lib/mastery/`, `functions/src/index.ts`) |
| 5 | **Scaffolding & desirable difficulty** | Implemented | Concreteness fading, block modes, `lockBlocks`/`starterCode`, construct enforcement, points decay (`src/problem-types/`, `src/lib/grading/constructCheck.ts`) |
| 6 | **Immediate explanatory feedback** | Implemented (strong) | `diagnose()` misconception hints + authored per-failure feedback (`src/lib/grading/diagnostics.ts`) |
| 7 | Worked examples & completion problems | Implemented | "Worked demo" articles, Parsons problems, `program_stepper` (`src/problem-types/parsons_problem/`, `article/widgets/`) |
| 8 | Concreteness fading | Implemented | Blocks-that-are-Python → Parsons → typed sandbox arc (`src/content/lessons/l1`, `l7`) |
| 9 | Generation effect / learning by doing | Implemented | Real Python typed and executed in-browser via Pyodide (`src/lib/pyodide/runner.ts`) |
| 10 | Dual coding / multimedia | Implemented | 15 interactive concept widgets (`src/problem-types/article/widgets/`) |
| 11 | Cognitive-load management | Implemented | Minimal text, one-panel-at-a-time gating, "one new idea per lesson" (`ArticleStep.tsx`) |
| 12 | Metacognition / prediction | Partial | "Predict-first" framing in steppers/decision widgets |
| 13 | Learning from errors | Implemented | Real runtime errors taught as fixable; misconception diagnostics |
| 14 | Curriculum coherence / backward design | Implemented | Capstone-coverage contract test (`tests/phase-9-curriculum/capstone-coverage.test.ts`) |
| 15 | Gamified motivation (Sparks, streaks) | Implemented | Points with decay, daily streak with grace day (`src/lib/progress/`) |
| — | **Product analytics / telemetry** | **Not implemented** | No event stream (`logEvent`/`gtag`/Amplitude) anywhere; all metrics are offline-derivable from Firestore only |

**One-line takeaway:** Pyxel is strong on *in-the-moment* learning science —
retrieval, scaffolding/fading, worked examples, and especially explanatory
feedback — and on a binary end-of-lesson **mastery** gate. Its biggest gaps are
**spaced repetition** (absent), **true cross-concept interleaving** (mostly
blocked), and an **analytics pipeline** to actually measure any of it
(everything is currently only derivable by exporting Firestore).

---

## 2. Retrieval practice

**Status: Implemented (recognition + generative recall).**

### Principle
Make learners *recall* an idea from memory (and produce an answer) rather than
re-read or merely recognize it. The act of retrieval is itself what strengthens
the memory ("testing effect").

### How Pyxel implements it
- **Mastery Recall stage.** Every lesson ends in a Mastery Challenge whose first
  phase is 3–5 multiple-choice questions tagged by concept
  (`src/content/mastery/types.ts`, authored in `src/content/mastery/specs.ts`).
  They are **retry-until-correct**, and only the *first* answer is scored for
  concept-weighting (`src/lib/mastery/attempt.ts → recordRecallAnswer`). This is
  cued **recognition** (2–4 visible choices), the lighter end of retrieval.
- **Generative recall in Apply.** The second phase makes the learner *write
  Python from scratch* against hidden test cases (`src/pages/mastery/MasteryApply.tsx`,
  `src/problem-types/python_sandbox/`). Producing code with no options to pick
  from is strong, generative retrieval and transfer.
- **Checkpoints inside articles.** Concept articles interleave MCQ checkpoints
  between explanation panels (`src/problem-types/article/Checkpoint.tsx`), so
  recall happens continuously, not only at lesson end.
- **Problems over passive review.** The whole step model favors *doing*
  (block/Parsons/sandbox problems) over reading; articles are deliberately
  "do first, read little" (see `PRD.md` lesson structure and
  `brilliant_lesson_rehaul.md §1`).

### Impact on learners
Repeated successful retrieval improves long-term retention and makes knowledge
accessible under new conditions (transfer). The Recall→Apply pairing means a
learner first retrieves *facts* about a concept, then has to *use* it — a much
stronger memory trace than re-reading the lesson.

### How to measure it
- **Primary metric:** first-try Recall accuracy per concept, and Apply
  first-try pass rate.
- **Available today:** `MasteryAttempt.missedConcepts` and `applyResults` are
  persisted (`src/lib/mastery/attempt.ts`, `src/lib/progress/store.ts`).
- **Gap:** `recallFirstTry` (per-question first-try correctness) is *defined in
  the type but not persisted* — `MasteryRecall.tsx` tracks it only in local refs
  and forwards just `missedConcepts`. Persist `recallFirstTry` to measure
  per-question/per-concept retrieval strength.
- **Effectiveness test:** compare Apply pass rate for concepts the learner *did*
  vs. *did not* miss in Recall; and (with spacing added, §3) measure retention
  by re-testing a concept N days later.

---

## 3. Spaced repetition

**Status: Not implemented.**

### Principle
Bring concepts back at *expanding* intervals, and resurface items a learner got
wrong *sooner*. Spacing combats the forgetting curve far better than massed
practice.

### What exists instead
A thorough search for scheduling primitives (`interval`, `schedule`, `due`,
`review`, `ease`, `lapse`, `resurface`, `revisit`, `cooldown`, `decay`, SM-2 /
Leitner) found **no spaced-repetition engine**. The only "got it wrong → practice
it again" mechanism is **within the same session**: concepts missed in Recall
immediately weight the Apply stage (`src/lib/mastery/attempt.ts → struggledConcepts`,
`src/lib/mastery/generateApply.ts`). That is *immediate corrective practice*
(massed), not spacing.

Adjacent uses of similar words are unrelated: `decay` is the per-step **points**
decay (`src/lib/progress/points.ts`); `interval` is an AI rate-limit
(`functions/src/index.ts`); "review" is UI copy offering an optional AI refresher
lesson (`src/pages/mastery/MasteryBriefingCard.tsx`).

### Impact on learners (today / if added)
- **Today:** none — once a lesson is cleared, its concepts are never
  automatically resurfaced. Retention rests entirely on the capstone re-using
  earlier constructs (a form of cumulative practice, but not scheduled).
- **If added:** materially better long-term retention and a built-in reason to
  return daily (which would also strengthen the streak mechanic in §15).

### How to measure it / what to build
- **Build:** a lightweight per-concept review schedule on the user doc
  (e.g. `reviews/{uid}/{concept}` with `lastSeen`, `interval`, `ease`,
  `dueAt`), seeded from `missedConcepts`. A daily "Warm-up" surfaces due
  concepts as Recall-style items.
- **Primary metric once built:** delayed retention — accuracy on a concept's
  *second* exposure as a function of the gap since first mastery.
- **Available today to bootstrap it:** `missedConcepts` per lesson and
  `activeDays`/`lastActiveDate` for cadence already exist.

---

## 4. Interleaving

**Status: Partial — formats interleaved, concepts mostly blocked.**

### Principle
Mix problem *types/concepts* within a session (A-B-A-C-B) instead of blocking
them (A-A-B-B-C-C), so the learner must first decide *which* approach applies —
not just repeat the last one.

### How Pyxel implements it
- **Interleaving of representations (yes).** A single lesson deliberately mixes
  step *formats* — concept article → block problem → Parsons → typed sandbox —
  forcing the learner to re-engage the same idea through different modalities.
  Example arcs: L5 = article → article → python(fix) → article → parsons →
  python(write); L7 = article → article → parsons → python
  (`src/content/lessons/l5-making-decisions.ts`, `l7-loops-and-decisions.ts`).
- **Cumulative interleaving at the capstone (yes).** FizzBuzzPop forces the
  learner to *choose and combine* loop + modulo + conditional + accumulator in
  one problem, which is exactly the "pick the right tool" demand interleaving
  trains (`src/content/mastery/specs.ts → l9`).
- **Concept interleaving within practice (no/limited).** Recall questions run in
  fixed authored order (no shuffle); Apply runs strictly *after* all Recall
  (blocked, see the `Recall → Apply` tracker in
  `src/pages/mastery/MasteryProgress.tsx`). Only Parsons problems shuffle their
  line order.

### Impact on learners
The format mixing already builds flexible, transferable understanding (seeing
`if` as a stepper animation, a Parsons puzzle, and typed code). The missing
piece — randomly interleaving *which concept* a problem targets — is what most
improves discrimination between similar procedures.

### How to measure it
- **Primary metric:** transfer/discrimination — performance on mixed problem
  sets vs. blocked sets of the same items.
- **Available today:** step `type` and per-step `attempts`/`wrongAttempts`
  (`src/lib/progress/model.ts`) let you compare difficulty across formats.
- **Gap / experiment:** add a shuffled "mixed review" mode and A/B it against the
  current blocked order, measuring first-try accuracy and later retention.

---

## 5. Mastery learning

**Status: Implemented (binary mastery; soft gating).**

### Principle
Require genuine mastery of a concept — a clear pass signal — before unlocking the
next, so learners don't accumulate gaps.

### How Pyxel implements it
- **A per-lesson Mastery Challenge** runs a small phase machine
  `intro → briefing → recall → apply → complete` (`src/lib/mastery/attempt.ts`).
  The briefing states the bar explicitly: *"Everything must be correct to master
  this lesson"* (`src/pages/mastery/MasteryBriefingCard.tsx`). Both phases are
  retry-until-correct, so finishing the challenge *is* the mastery signal.
- **Server-authoritative mastery flag.** Completion is committed by a Cloud
  Function that writes the lesson id into `users/{uid}.masteredLessons` (the
  gold-star signal) and awards Sparks exactly once via a
  `masteryRewards/{uid}_{lessonId}` ledger (`functions/src/index.ts →
  commitMasteryCompletion`). Clients cannot forge it (`firestore.rules`).
- **Performance-adaptive remediation.** Mastery isn't just pass/fail: concepts
  missed in Recall drive *how many* and *which* Apply problems appear
  (`desiredApplyCount`, `struggledConcepts` in `src/lib/mastery/attempt.ts`;
  generation + Pyodide self-test guard in `src/lib/mastery/generateApply.ts`).
- **Prerequisite coverage contract.** The curriculum guarantees every construct
  used in the FizzBuzzPop capstone is taught in an earlier lesson, enforced by a
  test that fails CI if a teaching block is dropped
  (`tests/phase-9-curriculum/capstone-coverage.test.ts`). This is mastery
  learning applied to *curriculum design*, not just per-learner gating.

### Important nuance (honest limitation)
Mastery is **binary** (no numeric mastery score), and lesson **unlocking is
soft**: the next lesson opens when the previous one is "cleared," defined as
*step-complete **or** mastered* (`src/lib/progress/useCourseProgress.ts`). So for
L1–L8 a learner can advance by finishing the graded steps **without** passing the
Mastery Challenge; mastery earns the gold star and big Spark award but isn't a
hard gate. (L9 is the exception — it has no graded steps, so mastery is its only
completion path.) The PRD lists "mastery scores and adaptive sequencing" as a
deliberate Nice-to-Have (`PRD.md`).

### Impact on learners
A clear, celebrated "you've truly got it" moment per lesson; targeted re-practice
of exactly what they fumbled; and a curriculum guarantee that they're never asked
to use something they were never taught.

### How to measure it
- **Primary metrics:** mastery attempt rate (of those who finish a lesson, how
  many start the challenge), mastery pass rate, and Recall→Apply concept
  correlation.
- **Available today:** `users.masteredLessons`, `masteryRewards.correctCount`,
  and `MasteryAttempt` (`missedConcepts`, `applyResults`).
- **Gaps:** number of retries per Recall/Apply question and time-to-master are
  **not** persisted (they live in component-local state). Add a per-attempt
  counter and timestamps to quantify "how hard was mastery."

---

## 6. Scaffolding & desirable difficulty

**Status: Implemented (rich).**

### Principle
Start with support, then *fade* it, keeping problems hard enough to grow from
("desirable difficulties") without tipping into frustration.

### How Pyxel implements it

**Support fading (concreteness fading):**
- A deliberate arc from drag-and-drop **blocks that *are* Python** → **Parsons**
  (reorder real lines) → **typed sandbox**. L1 explicitly fades blocks → typed
  `print(...)`; L7 "deliberately moves OFF blocks toward typed Python"
  (`src/content/lessons/l1-talking-to-the-computer.ts`,
  `l7-loops-and-decisions.ts`).
- **Block modes** provide graduated support: `fill_blank` (drop into a partial
  program), `bugfix` (fix a provided buggy program), `sandbox` (free build) —
  plus `lockBlocks` and `starterCode` that shrink as lessons progress
  (`src/problem-types/block_problem/schema.ts`,
  `src/problem-types/python_sandbox/schema.ts`).
- **Per-panel gating** inside articles reveals one idea at a time
  (`src/problem-types/article/ArticleStep.tsx`), and the rehaul spec's design
  rule is "one new idea per lesson" (`brilliant_lesson_rehaul.md`).

**Desirable difficulty (keeping it hard enough):**
- **Construct enforcement** prevents shortcut answers: a step can require a
  `loop`/`modulo`/`conditional` and forbid hard-coded output, so a learner can't
  print the literal expected string — they must build the real mechanism
  (`src/lib/grading/constructCheck.ts`; used by `pythonGrader.ts` and mastery
  Apply). "Right answer, but you hardcoded it — solve it with a loop instead."
- **Hidden test cases** (LeetCode-style) mean learners can't pattern-match to a
  visible answer (`src/problem-types/python_sandbox/`).
- **Points decay** makes guessing costly: `awarded = max(minPoints, basePoints −
  wrongAttempts × decrement)`, reaching the floor after ~5 wrong tries
  (`src/lib/progress/points.ts`). This is an explicit nudge to think before
  submitting (the PRD calls out "watching whether the points-decay model
  discourages guessing").
- **Lenient grading early, strict later** tunes difficulty to the learner's
  level: early lessons can ignore case/whitespace so focus stays on structure;
  later lessons stay strict (`lenient` flag in the block/python schemas).
- **The capstone withholds help** until you try, then gives *one earned hint per
  wrong submission* (§7 / `diagnostics.ts`).

### Impact on learners
Beginners get enough structure to make a first move (fill-blank, locked blocks,
starter code), then are progressively forced to generate more themselves —
arriving at "write FizzBuzzPop unaided." Construct enforcement and decay keep the
difficulty *productive* rather than gameable.

### How to measure it
- **Primary metric:** wrong-attempts distribution per step (the PRD's "attempts
  per step" metric) — flags steps that are too hard (frustration) or too easy
  (no desirable difficulty).
- **Available today:** `StepProgress.attempts`, `wrongAttempts`, `pointsAwarded`,
  `lastCorrect` (`src/lib/progress/model.ts`); compare `pointsAwarded` against the
  authored `basePoints`/`minPoints` to see how much decay learners actually incur.
- **Gap:** no record of which scaffold a learner used (e.g. did fading help?). To
  measure fading, tag steps by support level and compare downstream success on the
  faded (typed) step for learners who did vs. skipped the scaffolded one.

---

## 7. Immediate, explanatory feedback

**Status: Implemented (the strongest learning-science feature in the app).**

### Principle
Feedback should be immediate and *teach* — a wrong answer should explain enough
to fix the misconception, without simply revealing the answer.

### How Pyxel implements it
- **Immediate, on every submit.** Block, Python, Parsons, and checkpoint steps
  all grade and surface feedback the moment the learner presses Run/Check; a
  wrong answer re-keys the UI so the failure animation replays without blocking
  retry (`BlockProblemStep.tsx`, `PythonSandboxStep.tsx`,
  `ParsonsProblemStep.tsx`, `Checkpoint.tsx`).
- **Misconception-specific automatic hints (`diagnose()`).** The grader turns a
  failed run into a kid-friendly, answer-free hint
  (`src/lib/grading/diagnostics.ts`):
  - *Syntax / runtime:* missing quote, bad indentation, missing colon, undefined
    name, type-mismatch comparisons — read from real Python stderr.
  - *Concept confusions:* `=` vs `==` inside a condition; `elif`/`else` with no
    `if`.
  - *Output heuristics:* off-by-one ("your numbers start one too high — check the
    start of your range"), "values all run together — add a space," "printed one
    line too many," and empty-output vs wrong-text distinctions.
- **Authored per-failure feedback.** Each Python test case can carry a `feedback`
  string that teaches *what to check* without giving the answer (e.g. the L7
  "check three things…" hint); Parsons steps have distinct `orderHint` vs
  `indentHint`; checkpoints have `feedback.incorrect`
  (`src/problem-types/python_sandbox/schema.ts`, `parsons_problem/schema.ts`,
  `content/mastery/specs.ts`).
- **The "never reveal the answer" mandate.** A hard global rule, enforced by
  authoring guidelines and validation that *requires* failure hints on
  custom/AI content (`src/lib/ai/validate.ts`, `brilliant_lesson_rehaul.md §0`).
- **Capstone "earned hints."** FizzBuzzPop gives exactly one nudge per wrong try,
  in priority order (missing loop → conditional → modulo → accumulator → "trace
  15 by hand") — a progressive-hint ladder (`diagnostics.ts → firstMissingElementHint`).
- **Construct feedback teaches *method*, not just output:** "Right answer, but use
  a loop instead of writing each line" (`constructCheck.ts → constructHint`).

### Impact on learners
Wrong answers become teaching moments. Because hints target the *specific*
misconception (off-by-one, `==` vs `=`, missing indentation) and never hand over
the solution, learners stay in the productive-struggle zone and build a real
mental model of *why* Python behaves as it does.

### How to measure it
- **Primary metric:** post-feedback recovery — the fraction of learners who pass
  on the *next* attempt after seeing a hint, and the reduction in `wrongAttempts`
  over a step.
- **Available today:** `attempts` and `wrongAttempts` let you see how many tries
  precede success.
- **Gap (important):** hints are rendered but **not logged** — there's no record
  of *which* hint a learner saw or whether they read it. To measure feedback
  effectiveness, log each hint shown (`stepId`, hint id/type, attempt #) and join
  it to the next attempt's outcome. This also unlocks A/B testing hint wording.

---

## 8. Worked examples & completion problems

**Status: Implemented.**

### Principle
Novices learn more from studying a *worked example* than from unguided problem
solving; "completion problems" (fill in the missing parts) bridge from studying
to doing, and Parsons problems isolate *structure* from syntax.

### How Pyxel implements it
- **Worked-demo articles** narrate a full solution before the learner attempts a
  near-identical one — an explicit "I do → we do → you do" arc (L7's worked demo
  precedes its Parsons + typed step; `src/content/lessons/l7-loops-and-decisions.ts`).
- **`program_stepper` / `code_tracer` widgets** step through execution line by
  line with running variable state and "predict-first" prompts
  (`src/problem-types/article/widgets/ProgramStepper.tsx`, `CodeTracer.tsx`).
- **Parsons problems** ask learners to reorder/indent real Python lines —
  completion-style practice that removes the burden of recall-from-blank while
  still training program structure (`src/problem-types/parsons_problem/`).
- **Completion via `fill_blank` / `bugfix`** block and Python steps (§6).

### Impact on learners
Lowers cognitive load for novices (less floundering), then transfers cleanly: a
Parsons hint even points back to the worked demo ("this is built almost exactly
like the worked demo right before this — press Back, study it, match it here").

### How to measure it
- **Metric:** success rate on the *target* problem for learners who engaged the
  worked example/Parsons vs. those who skipped/failed it.
- **Available today:** completion status of the article/Parsons step and the
  downstream typed step (`StepProgress.status`, `currentStepIndex`).
- **Gap:** stepper "predict" interactions aren't recorded; capture them to see
  whether prediction (not just watching) drives the benefit.

---

## 9. Concreteness fading

**Status: Implemented.**

### Principle
Start from concrete manipulatives, then fade to abstract symbols, so intuition
transfers to formal notation.

### How Pyxel implements it
Blocks whose labels *are* Python (concrete, draggable) → Parsons (real lines, but
arrangement is given) → typed Python (fully symbolic), reinforced by widgets that
make abstract operations physical (e.g. `repeated_addition`, `modulo_picker`,
`loop_visualizer`, `range_machine`). The block graph literally compiles to the
same Python that later steps require, so the concrete and abstract forms are
provably the same thing (`src/lib/blocks/compiler.ts`, `PRD.md` block engine).

### Impact on learners
"The jump to typed code feels natural" (README) — the manipulative and the symbol
are the same object, so confidence built with blocks carries into the editor.

### How to measure it
Compare first-try success on a typed step against the equivalent earlier block
step (same concept). A large drop signals the fade was too steep. Data: per-step
`wrongAttempts` across the matched block/typed pair.

---

## 10. Generation effect & learning by doing

**Status: Implemented.**

### Principle
Generating an answer (especially *producing* real artifacts) beats passively
reviewing; authentic practice transfers better than proxies.

### How Pyxel implements it
Learners write and **execute real Python in the browser** via Pyodide (CPython on
WebAssembly), graded against hidden test cases entirely client-side
(`src/lib/pyodide/runner.ts`, `src/lib/grading/pythonGrader.ts`). This is the
app's signature advantage over Brilliant's no-execution pseudocode model
(`brilliant_lesson_rehaul.md §2`). The capstone requires generating an entire
program unaided.

### Impact on learners
Authentic skill: by the end they have actually *written and run* Python, not just
arranged tiles — the stated product goal in `PRD.md` (write a script that runs
start-to-finish).

### How to measure it
- **Metric:** capstone pass rate and number of independent (zero-hint) passes.
- **Available today:** `masteredLessons`/`masteryRewards` for the L9 capstone.
- **Gap:** the learner's actual submitted code is **not stored** —
  `lastSubmission` exists in the model but is never populated by `LessonPage`
  (`src/lib/progress/model.ts`, `src/pages/LessonPage.tsx`). Persisting
  submissions would enable error-pattern analysis and stronger effectiveness
  measurement.

---

## 11. Dual coding / multimedia learning

**Status: Implemented.**

### Principle
Pairing words with relevant visuals/interaction builds richer mental models than
text alone.

### How Pyxel implements it
Fifteen registered interactive concept widgets visualize mechanics that prose
can't: `loop_visualizer`, `function_machine`, `value_box`/`variable_box`,
`type_sorter`, `remainder_machine`, `modulo_picker`, `multiples_grid`,
`comparison_explorer`, `branch_visualizer`, `code_tracer`, `program_stepper`,
`range_machine`, `decision_machine`, `repeated_addition`
(`src/problem-types/article/widgets/`, enum in `article/schema.ts`). Prose is kept
deliberately light ("do first, read little").

### Impact on learners
Abstract ideas (a loop "repeating," a variable box being overwritten, a remainder)
become things the learner *manipulates and sees*, which is especially important
for the 5th–7th-grade target audience.

### How to measure it
Widget interaction completion is gated (the Continue button unlocks only after the
activity is done — `ArticleStep.tsx`), so completion is observable. To measure
*depth* of engagement, log interaction counts per widget (currently not captured).

---

## 12. Cognitive-load management

**Status: Implemented.**

### Principle
Working memory is limited; minimize extraneous load and introduce intrinsic load
gradually.

### How Pyxel implements it
- One concept panel revealed at a time, gated on completing its activity
  (`ArticleStep.tsx`).
- "One new idea per lesson" curriculum design and explicit work to remove
  "difficulty cliffs" (e.g. teaching variable self-update in L2 so L7's
  accumulator introduces only one new thing) — see the change specs in
  `brilliant_lesson_rehaul.md §3–4`.
- Minimal reading; concepts emerge from interaction.
- A mobile symbol toolbar (`:`, `()`, indentation) to reduce extraneous typing
  load on phones (`PRD.md` mobile section).

### Impact on learners
Each step asks the learner to hold only a little new material in mind at once,
reducing overwhelm for true beginners.

### How to measure it
Per-step drop-off and wrong-attempt spikes localize overload (the PRD names "the
third block problem is the one to watch"). Data: `currentStepIndex` distribution
and per-step `wrongAttempts`.

---

## 13. Metacognition & prediction

**Status: Partial.**

### Principle
Asking learners to *predict* an outcome before revealing it improves attention and
exposes misconceptions (a metacognitive prompt).

### How Pyxel implements it
"Predict-first" framing in the stepper/decision widgets and checkpoint prompts
(e.g. L5's "predict first: which path should win?" in
`brilliant_lesson_rehaul.md` change specs; `decision_machine`, `program_stepper`).

### Impact on learners
Turns passive watching into active commitment, so the subsequent reveal either
confirms or correctively surprises.

### How to measure it
- **Gap:** prediction choices aren't logged. Capture predicted-vs-actual to
  measure calibration and whether wrong predictions correlate with later step
  difficulty. Today only the terminal checkpoint correctness is observable.

---

## 14. Learning from errors

**Status: Implemented.**

### Principle
Errors are data; surfacing and explaining them (rather than hiding them) builds
robust understanding — especially real, reproducible failures.

### How Pyxel implements it
Because code actually runs, learners hit **real** Python errors (IndentationError,
SyntaxError, NameError, type errors), which `diagnose()` translates into
plain-language, fixable guidance (`src/lib/grading/diagnostics.ts`). Indentation
and runtime errors are taught "as real fixable things" rather than abstracted away
(`brilliant_lesson_rehaul.md §2`). Bugfix steps make *finding and fixing a defect*
the explicit task.

### Impact on learners
Learners build debugging skill and a tolerance for failure as a normal part of
programming, not a dead end.

### How to measure it
Recovery rate after an error (next-attempt success), and the most common error
classes per step. Data available: `wrongAttempts`. Gap: error type/stderr is not
persisted — logging the error category per failed attempt would directly measure
which misconceptions are most common and whether diagnostics reduce repeat errors.

---

## 15. Curriculum coherence / backward design

**Status: Implemented.**

### Principle
Design backward from the target performance; guarantee every prerequisite is
taught before it's required (coherent scope-and-sequence).

### How Pyxel implements it
The nine-lesson arc is built backward from FizzBuzzPop, and a CI test asserts the
**coverage contract**: print/variables/modulo/comparison/conditional/loop+range/
accumulator/functions each have a teaching home before the capstone, in the
intended order (`tests/phase-9-curriculum/capstone-coverage.test.ts`). If a
teaching block is dropped, the build fails.

### Impact on learners
No "we never taught you that" cliffs (the rehaul doc explicitly hunts these down).
The learner is always equipped for the next demand.

### How to measure it
This is a *design-time* guarantee measured by the test suite (green = contract
holds), not a runtime learner metric. Complement it at runtime with per-lesson
mastery pass rates to confirm the sequence is *experienced* as coherent.

---

## 16. Gamified motivation (Sparks, streaks, progress)

**Status: Implemented.**

### Principle
Well-designed extrinsic motivators (points, streaks, visible progress) support
engagement and habit formation; loss-aversion and goal-gradient effects keep
learners coming back and finishing.

### How Pyxel implements it
- **Sparks (✦)** points per step, server-authoritative, with the decay model in
  §6 (`src/lib/progress/points.ts`, `functions/src/rewards.ts`; mastery awards a
  larger one-time bonus). Sparks are also a *currency* — spending 500 to generate
  a custom AI lesson (`src/lib/ai/cost.ts`).
- **Daily streak** counting consecutive active days, with a **1-day grace** so a
  single miss doesn't reset it (loss-aversion done humanely) — `src/lib/progress/streak.ts`,
  surfaced via `StreakBadge`/`StreakModal`.
- **Progress bars / step gauges** show "steps completed / total," a goal-gradient
  cue (`src/components/ProgressBar.tsx`, `StepGauge.tsx`), and the results page
  animates checkmarks filling in.

### Impact on learners
Immediate reward for effort, a reason to return daily, and constant visible
progress toward a finish line — tuned for younger learners.

### How to measure it
- **Metrics:** day-N retention, streak-length distribution, % returning after a
  grace day, and lesson-completion lift for streak-holders.
- **Available today:** `users.currentStreak`, `activeDays`, `lastActiveDate`,
  `totalPoints`, plus the reward ledgers (`functions/src/index.ts`).
- **Gap / caution:** streak day boundaries use **UTC server-side** but **local
  time client-side**, which can disagree near midnight — worth validating before
  trusting streak metrics. No analytics events, so retention must be computed by
  exporting profile docs.

---

## 17. Measurement & instrumentation plan

This is the heart of "how do we track impact and effectiveness." The honest
summary: **Pyxel persists a solid gameplay/progress layer, but has no product
analytics pipeline.** A repo-wide search for `analytics`, `logEvent`, `gtag`,
`Mixpanel`, `Amplitude`, `getAnalytics`, `track(` found **zero application
usage**; `src/firebase/config.ts` initializes only Auth, Firestore, Functions,
and App Check. So today, *all* metrics must be derived offline from Firestore
exports (or BigQuery if connected).

### 17.1 What is measurable today (from Firestore, no new code)

| Metric | Source fields | Notes |
|--------|---------------|-------|
| Lesson completion rate | `progress/{uid}_{lessonId}.steps.*.status`, `users.completedLessons` | The PRD's #1 metric |
| Per-step drop-off | `progress.currentStepIndex` + step `status` | Find friction points |
| Attempts / wrong attempts per step | `StepProgress.attempts`, `wrongAttempts` | Difficulty + desirable-difficulty signal |
| Points-decay incurred | `StepProgress.pointsAwarded` vs authored `basePoints`/`minPoints` | Does decay discourage guessing? |
| Mastery attempt + pass rate | `users.masteredLessons`, `masteryRewards.correctCount`, `MasteryAttempt` | Mastery learning effectiveness |
| Missed-concept frequency | `MasteryAttempt.missedConcepts` | Which concepts are weakest |
| Streak / retention proxies | `users.currentStreak`, `activeDays`, `lastActiveDate` | Habit formation |
| Sparks economy | `users.totalPoints`, `rewards`, `masteryRewards`, `aiLessons.cost` | Motivation/engagement |
| Custom-lesson usage | `users/{uid}/aiLessons`, `aiUsage/{uid}` | Autonomy/engagement |

These map directly to the PRD's stated MVP metrics: **lesson completion rate,
per-step drop-off, attempts per step** (`PRD.md → Success Metrics`).

### 17.2 What is NOT measurable today (needs instrumentation)

- **No event stream / funnels** — no session ids, no time-stamped events.
- **No time-on-task / session duration / idle detection.**
- **Hint exposure not logged** — can't tell which hint was shown or read
  (blocks measuring feedback effectiveness, §7).
- **Submissions not stored** — `lastSubmission` is unused, so learner code and
  error types are lost (§10, §14).
- **`recallFirstTry` not persisted** — per-question retrieval accuracy is dropped
  (§2).
- **Prediction choices not logged** (§13); **widget interaction depth not logged**
  (§11).
- **Wrong-attempt counts are client-reported** to the reward function, so they're
  a soft signal for trust-sensitive analysis (`functions/src/index.ts`).
- **No A/B experiment framework.**

### 17.3 Recommended minimum instrumentation (highest leverage first)

1. **Add an analytics event sink** (Firebase Analytics / BigQuery export, or a
   `events/{uid}/...` collection). Emit structured events:
   `step_view`, `step_attempt {stepId, correct, wrongAttempts, errorClass?,
   hintShown?, msSinceStepStart}`, `hint_shown {stepId, hintId, attempt}`,
   `mastery_phase {lessonId, phase}`, `recall_answer {lessonId, qIndex, concept,
   firstTryCorrect}`, `apply_result {lessonId, qIndex, passed}`.
2. **Persist `recallFirstTry`** (already typed) and **`lastSubmission`** (already
   typed) — both are near-free wins that unlock §2, §10, §14.
3. **Log hint exposure + error class** per failed attempt to measure feedback and
   error-recovery (§7, §14).
4. **Add timestamps** for step start/finish to get time-on-task and time-to-mastery.
5. **Reconcile streak timezone** (UTC server vs local client) before trusting
   retention numbers (§16).

### 17.4 Suggested effectiveness experiments

| Technique | Experiment |
|-----------|-----------|
| Retrieval (§2) | Compare delayed Apply accuracy for missed vs. aced Recall concepts |
| Spacing (§3) | Ship a daily warm-up of due concepts; measure delayed retention vs. control |
| Interleaving (§4) | A/B shuffled "mixed review" vs. blocked practice; measure transfer |
| Mastery (§5) | Compare downstream lesson success for learners who mastered vs. only step-completed the prior lesson |
| Scaffolding/fading (§6, §9) | Compare typed-step success for learners who did vs. skipped the scaffolded precursor |
| Feedback (§7) | A/B hint wording / hint-on-first-fail vs. delayed; measure next-attempt recovery |
| Gamification (§16) | Compare retention for streak-holders vs. not; measure grace-day return rate |

---

## 18. Gaps & recommendations (priority order)

1. **Instrument the app (§17.3).** Without events, none of the above can be
   measured in production; this is the single biggest blocker.
2. **Add spaced repetition (§3).** The most impactful *missing* learning-science
   technique; `missedConcepts` already gives you the seed data.
3. **Persist `recallFirstTry`, `lastSubmission`, hint exposure, and error class.**
   Cheap, high-value, unlocks measurement of retrieval, generation, and feedback.
4. **Introduce concept-level interleaving / mixed review (§4).**
5. **Decide whether mastery should hard-gate progression (§5)** or stay a soft,
   rewarded goal — and measure the trade-off.
6. **Add the "stuck-learner escape hatch"** already specified in
   `PRD.md → MVP Extensions` (reveal-with-points-forfeit after the floor), and
   log its usage as a difficulty signal.

---

## 19. Source map (for re-auditing)

- **Mastery:** `src/content/mastery/{types,specs,index}.ts`,
  `src/lib/mastery/{attempt,commit,generateApply}.ts`, `src/pages/mastery/*`,
  `functions/src/{index,masterySpec,rewards}.ts`
- **Retrieval / checkpoints:** `src/problem-types/article/Checkpoint.tsx`
- **Feedback / diagnostics:** `src/lib/grading/{diagnostics,constructCheck,
  pythonGrader,blockGrader,parsonsGrader,outputGrader,loopCheck}.ts`
- **Scaffolding / problem types:** `src/problem-types/{registry.ts,article,
  block_problem,parsons_problem,python_sandbox}`
- **Progress / gamification:** `src/lib/progress/{model,points,streak,rewards,
  store,useCourseProgress,useLessonProgress,week}.ts`, `src/components/{ProgressBar,
  StepGauge,StreakBadge,StreakModal,Currency}.tsx`
- **Persistence / security:** `src/lib/users.ts`, `firestore.rules`,
  `src/firebase/config.ts`
- **Curriculum & coverage contract:** `src/content/lessons/*`,
  `tests/phase-9-curriculum/capstone-coverage.test.ts`
- **Product context:** `documentation/{PRD.md,ARCHITECTURE.md,
  brilliant_lesson_rehaul.md}`, `README.md`
