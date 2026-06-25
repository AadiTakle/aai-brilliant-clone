# Curriculum constraints (read before rehauling a lesson)

This file is the guardrail set for a lesson-rehaul subagent. Respect it so a
restructured lesson still validates, still teaches every construct the capstone
needs, and never collides with a sibling subagent.

## Lesson file map (id → file)

| id | file |
|---|---|
| `l1-talking-to-the-computer` | `src/content/lessons/l1-talking-to-the-computer.ts` |
| `l2-boxes-that-remember` | `src/content/lessons/l2-boxes-that-remember.ts` |
| `l3-doing-the-math` | `src/content/lessons/l3-doing-the-math.ts` |
| `l4-true-or-false` | `src/content/lessons/l4-true-or-false.ts` |
| `l5-making-decisions` | `src/content/lessons/l5-making-decisions.ts` |
| `l6-over-and-over-again` (L6) | `src/content/lessons/l6-over-and-over-again.ts` |
| `l7-loops-and-decisions` | `src/content/lessons/l7-loops-and-decisions.ts` |
| `l8-build-your-own-machine` | `src/content/lessons/l8-build-your-own-machine.ts` |
| `l9-fizzbuzzpop` | `src/content/lessons/l9-fizzbuzzpop.ts` |

Lessons are registered in display order in `src/content/lessons/index.ts`.
**Do not change a lesson id or the registration order** — both are asserted by tests.

## What a lesson is (the data model)

- A lesson is `{ id, title, version, steps[] }`. Each step is a discriminated union
  on `type` with base fields `{ id, title?, graded, points, minPoints }`.
- Step types: `article`, `block_problem`, `python_sandbox`, `parsons_problem`.
  Schemas: `src/content/schemas.ts`. Step renderers: `src/problem-types/registry.ts`.
- Article widgets available (do not invent new ones without a shared change):
  `repeated_addition`, `loop_visualizer`, `function_machine`, `variable_box`,
  `type_sorter`, `remainder_machine`, `multiples_grid`, `comparison_explorer`,
  `branch_visualizer`, `code_tracer`. Widget configs are strict Zod schemas in
  `src/problem-types/article/schema.ts`.
- Block types live in `src/lib/blocks/definitions.ts` (`BLOCK_DEFS`). Graded block
  problems need `expectedOutput`; `mode: 'sandbox'` is ungraded.
- `requiredConstructs: ('loop'|'modulo'|'conditional')[]` makes graded steps honest
  (the grader checks the construct is actually used). `requireLoop: true` is a legacy
  alias of `['loop']`.
- After any content change run `npm run validate-content`.

## Reusable feedback/UX features (prefer these over shared edits)

These exist already — set them in the lesson's step config; no shared-file change
needed (so the lesson stays parallel-safe):

- **Lenient output matching**: `block_problem` and `python_sandbox` steps accept a
  `lenient: true` flag (default false) → case-insensitive, whitespace-insensitive,
  trailing-punctuation-tolerant grading (empty output never passes). Wired through
  `gradeBlocks` / `gradePython` via `gradeOutput`'s `{ lenient }` option.
- **Failure-type-specific hints**: diagnostics take a `kind: 'block' | 'python'`
  so empty-vs-wrong output produce different, answer-free hints. The block/python
  step components already pass their kind.
- **Success message**: `python_sandbox` steps support an optional `successMessage`
  string rendered on pass. (If a block step needs the same, that's a new shared
  change — stop and report.)
- **Animated `function_machine`**: the widget animates input→machine→output on Run
  and respects `prefers-reduced-motion`. Reuse as-is.

Global feedback rule (user mandate): incorrect-answer feedback must guide toward the
fix but NEVER give the answer outright or even implicitly. Rewrite any violating
feedback in a lesson you touch.

## The coverage contract (must keep passing)

`tests/phase-9-curriculum/capstone-coverage.test.ts` asserts that each lesson still
introduces the constructs the FizzBuzzPop capstone depends on. If you restructure a
lesson, the rebuilt lesson MUST still satisfy its row below (otherwise the capstone
could use something never taught). Prefer keeping these satisfied over editing the
contract test.

- **L1**: a `print` block exists; an article uses the `function_machine` widget; a
  python step's source/expected contains `print(2 + 3)`.
- **L2**: an `assign` block exists; articles use `variable_box` and `type_sorter`.
- **L3**: a `binop` with op `%` and a `binop` with op `+` exist; an article uses
  `remainder_machine`.
- **L4**: a `compare` block exists; an article uses `comparison_explorer`.
- **L5**: `if_block` and `else_block` exist; a `parsons_problem` step exists.
- **L6 (l6-over-and-over-again)**: a `for_each` block exists; a `range_call` has a
  `binop` in its `stop` slot (i.e. `range(1, n + 1)`).
- **L7**: an accumulator exists — an `assign` whose value is a `+` binop whose left
  is a `var`; an article uses `code_tracer`.
- **L8**: a python step's source contains `def ` and `return`.
- **L9**: the `capstone` step is a graded `python_sandbox` with
  `requiredConstructs` = `['conditional','loop','modulo']` and ≥1 test case; the
  reference solution in `tests/phase-9-curriculum/fixtures.ts` still matches the
  capstone's `expectedStdout`. If you change L9's expected output, update the
  reference solution fixture too.

Also asserted (`capstone-coverage.test.ts`): the nine ids appear in `EXPECTED_ORDER`.

## Tests to add/update for TDD (per lesson)

Existing curriculum-level tests you will most often touch:

- `tests/phase-9-curriculum/capstone-coverage.test.ts` — structural coverage per
  lesson + ordering. Update assertions ONLY if your restructure intentionally moves
  where a construct is taught (and keep the capstone covered).
- `tests/phase-9-curriculum/curriculum.pyodide.test.ts` — run-only block steps and
  python steps must produce their expected output under real Python. If you add a
  graded "run and observe" block step, add it to the `runOnly` list here. Runs under
  `npm run test:pyodide`.
- `tests/phase-9-curriculum/required-constructs.test.ts` — construct enforcement.
- `tests/phase-9-curriculum/parsons.test.tsx` — parsons ordering/indent.
- `tests/phase-9-curriculum/widgets.test.tsx` — article widget rendering.

For a lesson rehaul, add focused assertions that encode every behavioral change you
make (new/edited step produces the right output, enforces the right constructs, has
the intended steps). Write them first, watch them fail, then implement.

## Full gate

```
npm run validate-content
npx tsc -b
npm test
npm run test:pyodide   # if you touched runnable block/python steps
```

All must pass before declaring the lesson done.

## Parallel-safety rules

- Edit ONLY the target lesson file and its tests. Shared files (`schemas.ts`,
  widgets, `registry.ts`, graders, `definitions.ts`, `fixtures.ts` except the L9
  case noted above) may be edited by sibling subagents simultaneously.
- If a great fix needs a shared change, STOP and report it to the parent rather than
  editing the shared file. The parent will sequence shared changes.
