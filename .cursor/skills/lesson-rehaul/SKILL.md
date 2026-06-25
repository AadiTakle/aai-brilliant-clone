---
name: lesson-rehaul
description: >-
  Run the two-phase "questionnaire then parallel rehaul" workflow for improving a
  Python-curriculum lesson in this repo. Use when the user wants to evaluate and
  rebuild a lesson (or several lessons) for a true beginner, asks for the lesson
  guided questions / questionnaire, or asks to deploy a rehaul subagent for a lesson.
disable-model-invocation: true
---

# Lesson Rehaul

A repeatable procedure for taking one curriculum lesson at a time, interviewing the
user about where it succeeds and fails for a **pure beginner learning to code from
scratch**, then spawning a subagent that rebuilds that single lesson to be great.

Lessons live in `src/content/lessons/`. They are **data** validated by Zod and
guarded by a curriculum coverage contract. Read
[references/curriculum-constraints.md](references/curriculum-constraints.md) before
spawning any rehaul subagent — it holds the hard guardrails, file map, and the
per-lesson coverage assertions a subagent must keep passing.

## Workflow

For each target lesson, run two phases. Multiple lessons may be in flight at once:
do Phase 1 for a lesson, and once the user answers, kick off Phase 2 in the
background while you move to the next lesson's Phase 1.

```
Per lesson:
- [ ] Phase 1: read the lesson, emit the questionnaire, wait for the user's answers
- [ ] Phase 2: spawn a background rehaul subagent fed those answers
- [ ] Track which lessons are awaiting answers vs. actively rehauling
```

### Phase 1 — Questionnaire

1. Read the lesson file (see the file map in the reference).
2. For **every step**, apply this four-part lens, then ask 3–5 questions tailored
   to that step's specific content (quote the actual prompt / widget / expected
   output so questions are concrete, not generic):
   - **Intent** — what should a true beginner *know* or *be able to do* after this
     step that they couldn't before?
   - **Delivery** — does the step as built actually produce that outcome, or only
     look like it does? (e.g. starter code that already is the answer grades nothing.)
   - **Failure points** — where would a real novice (a 5th–7th grader who has never
     coded) get confused, stuck, or click through without learning?
   - **Gaps** — what's missing: scaffolding, a "why should I care" hook, feedback
     when wrong, a bridge to the next idea?
3. End with one **whole-lesson** question: what single sentence should a beginner be
   able to say after the lesson, and does it currently earn that sentence?
4. Tell the user to answer free-form, then stop and wait.

### Phase 2 — Rehaul subagent

When the user answers, spawn **one** subagent per lesson with the Task tool
(`subagent_type: "generalPurpose"`, `run_in_background: true` so lessons rehaul in
parallel). Use the prompt template below, filling in the lesson id and pasting the
user's answers verbatim. Then continue with the next lesson's Phase 1.

#### Subagent prompt template

```
You are rehauling exactly ONE lesson in the aai-brilliant-clone repo to make it
great for a PURE BEGINNER (5th–7th grader, never coded) learning Python from
scratch.

Target lesson id: <LESSON_ID>
Lesson file: src/content/lessons/<FILE>.ts

The user's evaluation answers (their expectations and where the step falls short):
<PASTE USER ANSWERS VERBATIM>

First, read .cursor/skills/lesson-rehaul/references/curriculum-constraints.md and
documentation/ARCHITECTURE.md, then the lesson file and its existing tests.

Authority & guardrails:
- You MAY restructure this lesson freely: add, remove, reorder, replace, or
  rewrite steps — as long as content validation and the curriculum coverage
  contract still pass (see the reference for the exact assertions this lesson must
  keep satisfying, and the lesson order / id which must NOT change).
- Edit ONLY this lesson's file and this lesson's tests. If a great fix truly needs
  a shared change (schema, a new widget/step type, registry, grader), STOP and
  report it to the parent instead of editing shared files — another subagent may be
  editing in parallel.
- Lessons are data: prefer authoring the lesson TS object + reusing existing step
  types and widgets over new UI.

Test-driven development (required):
1. BEFORE changing the lesson, update or add tests for THIS lesson that encode the
   intended behavior of every change (e.g. run-only block steps produce their
   expected output, required constructs are enforced, parsons solutions are
   ordered, python sandbox expected output is correct). Put them with the existing
   curriculum tests (see reference). Watch them fail.
2. Implement the lesson changes until those tests pass.
3. Run the full gate and make it green:
   npm run validate-content && npx tsc -b && npm test
   (run npm run test:pyodide if you touched runnable block/python steps).

Dependency handling: if part of this lesson depends on something not yet
available (a widget/schema/grader another lesson is still building, an
unanswered decision, a shared change you are not allowed to make), DO NOT block
up front. First COMPLETE every non-dependent portion of the lesson (and its
tests + the gate for what you changed). Only AFTER all independent work is done,
report the specific blocked portion and what it is waiting on. Never leave
finishable work undone just because a later part is blocked.

If you need a decision only the user can make, ask them DIRECTLY using the
AskQuestion tool (do not guess on irreversible/ambiguous product calls) — and
still finish the independent work first so you are not idle while waiting.

When done, report: what you changed and why (tie each change to the user's
answers), which tests you added/updated, the gate result, and any shared-change
blockers you hit.
```

## Notes

- This is a procedure, NOT the `/loop` skill. `/loop` is a time/event scheduler and
  is the wrong tool here.
- Keep each subagent scoped to a single lesson so parallel runs never touch the same
  file.
- Finish-then-block: a subagent must complete all non-dependent portions of its
  lesson (with tests + gate) before pausing on any dependency or clarification.
- If the user says "next lesson" or "do L3 too," repeat the workflow for that id.
