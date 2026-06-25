# Python from Scratch — Curriculum Build Spec

> **Status:** In progress
> **Owner:** —
> **Last updated:** 2026-06-24
> **Companion canvas:** `canvases/python-curriculum.canvas.tsx`

This is a **living document**. Update the status tables and checklists as work
lands. Keep the "Decisions" log current so the rationale survives.

---

## 1. Goal

Replace the single lesson (*Over and Over Again*) with a slow, first-principles
arc of **9 lessons** that takes a 5th–7th grader with **little or no** coding
(or block-code) experience from "what is a program?" to writing **FizzBuzzPop**
from a blank editor with **zero guidance**, able to explain every line.

**Definition of done for the whole effort:**

- A learner who completes L1–L8 can pass the L9 capstone unaided.
- The capstone is graded and enforces a real loop + `%` + a conditional (cannot
  be faked with hardcoded prints).
- Every Python construct used in FizzBuzzPop is explicitly taught earlier.
- The full test gate (tsc, lint, unit, Pyodide, emulator, build) is green.

---

## 2. Open decisions (resolve before Phase A)

| # | Decision | Options | Resolution | Status |
|---|----------|---------|------------|--------|
| D1 | Teach early concepts (vars/math/if) in **blocks** or **typed Python**? | (a) Extend block engine (Phase A) so L2–L7 can be block-based; (b) Keep new concepts in `python_sandbox`, blocks only for loops | **(a) Extend the block engine** | Locked |
| D2 | FizzBuzzPop divisors | 3/5/7 ("Fizz/Buzz/Pop") vs other | **3/5/7** | Locked |
| D3 | Capstone range | Fixed (`range(1, 21)`) vs `input()`-driven N | **Fixed `n = 21`, `range(1, n + 1)`** | Locked |
| D4 | Build a Parsons problem type now or defer | Build in Phase C vs defer to v2 | **Build now** | Locked |

> If D1 = (b), Phase A shrinks to just `requiredConstructs` + detectors, and the
> "smallest viable path" in §8 applies.

---

## 3. Current system (reuse, do not rebuild)

Authoritative inventory — confirm against source before editing.

- **Content model:** `src/content/schemas.ts` (Zod), `src/content/loader.ts`,
  `src/content/lessons/index.ts` (catalog), `src/content/validate.ts`.
  - Lesson: `{ id, title, version, steps[] }`.
  - Step base: `{ id, title?, graded=false, points=100, minPoints=20, type, config }`.
  - `STEP_TYPES = ['article', 'block_problem', 'python_sandbox']`.
- **Step registry:** `src/problem-types/registry.ts` maps `type → { component, configSchema }`.
- **Step types:**
  - `article` — `panels[]`; each panel has `text?` (markdown) and/or `activity?`
    (`checkpoint` | `widget`). Widgets today: `repeated_addition`,
    `loop_visualizer`. Completion via interaction; no grading.
  - `block_problem` — `{ mode: 'sandbox'|'fill_blank'|'bugfix', prompt, palette[],
    initial[], expectedOutput?, requireLoop=false }`. Graded when
    `mode !== 'sandbox' && expectedOutput` set. Runs via Pyodide.
  - `python_sandbox` — `{ prompt, starterCode='', testCases[], requireLoop=false }`.
    Graded when `testCases.length > 0`. CodeMirror + Pyodide; supports `input()`,
    `while`, etc.
- **Grading:** `src/lib/grading/` — `outputGrader`, `pythonGrader` (multi-case,
  `requireLoop`), `blockGrader` (compile+run+compare), `loopCheck`
  (`usesLoopSource`), `diagnostics` (`diagnose`).
- **Block engine:** `src/lib/blocks/` — `definitions.ts` (6 blocks: `for_each`,
  `print`, `range_call`, `num`, `str`, `var`), `compiler.ts`, `workspace.ts`,
  `analysis.ts` (`usesLoopNode`, `LOOP_TYPES = {for_each}`).
- **Not yet supported in blocks:** `while`, variable assignment, `if/elif/else`,
  operators (`+ - * / // %`), comparisons, `input()`, f-strings, single-arg
  `range(n)`, functions.

---

## 4. The lesson arc

| # | Lesson | File | First-principles concept | New pieces |
|---|--------|------|---------------------------|------------|
| 1 | Talking to the Computer | `l1-talking-to-the-computer.ts` | Programs run top→bottom; `print()`; strings are quoted text; `print()` is a function (a machine you hand a value) | widget `function_machine` |
| 2 | Boxes that Remember | `l2-boxes-that-remember.ts` | Variable = labeled box; `=` stores; reassign overwrites; int vs str; naming | widgets `variable_box`, `type_sorter`; block `assign` |
| 3 | Doing the Math | `l3-doing-the-math.ts` | `+ - * / //` and `%` (remainder); divisible ⇔ remainder 0; `+` joins strings | widgets `remainder_machine`, `multiples_grid`; block `binop` |
| 4 | True or False | `l4-true-or-false.ts` | Booleans; `== != < > <= >=`; `n % 3 == 0`; light `and/or/not` | widget `comparison_explorer`; block `compare` |
| 5 | Making Decisions | `l5-making-decisions.ts` | `if/elif/else`; indentation = a block; order matters | widget `branch_visualizer`; blocks `if/elif/else`; type `parsons_problem` |
| 6 | Again and Again | `l6-over-and-over-again.ts` (refit) | `for` + `range(n)` / `range(start, stop)`; iteration | block `range_n`; reuse `repeated_addition`, `loop_visualizer` |
| 7 | Loops + Decisions Together | `l7-loops-and-decisions.ts` | `if` inside `for`; decide per number; build a result string with `+` | widget `code_tracer` |
| 8 | Build Your Own Machine | `l8-build-your-own-machine.ts` | `def`, parameters, `return`; why functions; `print()`/`range()` were functions | reuse `function_machine`; functions taught in `python_sandbox` |
| 9 | Capstone — FizzBuzzPop | `l9-fizzbuzzpop.ts` | Integrate everything; write from blank editor | grading `requiredConstructs` |

**FizzBuzzPop dependency chain** (nothing in the capstone is unexplained):
output/strings→L1, variables→L2, `%`→L3, comparisons/booleans→L4,
`if/elif/else`→L5, `for`+`range`→L6, loop+if+string-building→L7, functions→L8.

**Reference capstone solution** (string-building variant, divisors 3/5/7):

```python
n = 21
for i in range(1, n + 1):
    label = ""
    if i % 3 == 0:
        label = label + "Fizz"
    if i % 5 == 0:
        label = label + "Buzz"
    if i % 7 == 0:
        label = label + "Pop"
    if label == "":
        print(i)
    else:
        print(label)
```

---

## 5. Component specs

Each spec lists the **files to touch**, the **shape**, and **acceptance
criteria**. Field names are proposals — finalize at implementation.

### 5.1 Block engine extensions

> Skip entirely if D1 = (b).

**Shared engine work**

- New field kind `select` in `BlockField` (`src/lib/blocks/definitions.ts`):
  `{ name, kind: 'select', options: string[], default }`. Render as `<select>`
  in `src/problem-types/block_problem/BlockView.tsx`; handle in
  `workspace.ts` `set-field`.
- Recursive indentation in `src/lib/blocks/compiler.ts`: a parent prefixes 4
  spaces to each line returned by `ctx.statements(slot)`, so `for → if → print`
  nests to 8 spaces. Add a compile test for triple nesting.

**New blocks** (`definitions.ts` + compiler + palette grouping in `Palette.tsx`):

| Block type | Category | Label | Slots / fields | Compiles to |
|------------|----------|-------|----------------|-------------|
| `assign` | statement | `⬡ = ⬡` | `target` (expr, default `var name`), `value` (expr) | `{target} = {value}` |
| `if_block` | statement | `if ⬡:` | `cond` (expr, drop), `body` (stmt) | `if {cond}:` + indented body |
| `elif_block` | statement | `elif ⬡:` | `cond` (expr), `body` (stmt) | `elif {cond}:` + body |
| `else_block` | statement | `else:` | `body` (stmt) | `else:` + body |
| `compare` | value (expr) | `⬡ ⟨op⟩ ⬡` | `left` (expr), `op` (`select`: `== != < > <= >=`), `right` (expr) | `{left} {op} {right}` |
| `binop` | value (expr) | `⬡ ⟨op⟩ ⬡` | `left`, `op` (`select`: `% + - * //`), `right` | `{left} {op} {right}` |
| `range_n` | value (expr) | `range(⬡)` | `stop` (expr, default `num 5`) | `range({stop})` |

**Analysis** (`analysis.ts`): add `usesConditionalNode` (detects `if_block`),
`usesModuloNode` (detects `binop` with `op === '%'`). Used by `requiredConstructs`.

**Acceptance:** each block compiles correctly in a unit test; nested `for/if`
produces valid indented Python that runs in Pyodide; palette renders the new
blocks grouped sensibly; auto-filled leaf defaults stay inline-editable (3-char
fields) per existing UX.

### 5.2 Article widgets

For **each** widget: enum entry in `widgetSchema`, a strict config schema, both
in `src/problem-types/article/schema.ts`; a component in
`src/problem-types/article/widgets/`; a branch in `ActivityView` inside
`src/problem-types/article/ArticleStep.tsx`. Each must call `onComplete()` when
the learner finishes interacting (article gating depends on it).

| Widget | Config (proposed) | Behavior / teaches | Effort |
|--------|-------------------|--------------------|--------|
| `function_machine` | `{ name, inputs: {in, out}[], prompt? }` | input → named machine → output; intro to functions incl. `print`/`range` | M |
| `variable_box` | `{ steps: {name, value}[] }` | animate boxes filling/overwriting as assignments run | M |
| `type_sorter` | `{ items: {value, type:'number'\|'text'}[] }` | drag values into number/text bins | S |
| `remainder_machine` | `{ divisor, max?, start? }` | share items into groups of `divisor`; show quotient + remainder | M |
| `multiples_grid` | `{ max, divisors: number[] }` | hundreds-chart highlighting multiples + overlaps | M |
| `comparison_explorer` | `{ operators?: string[], presets?: {a,b,op}[] }` | choose values + operator, see True/False live | S |
| `branch_visualizer` | `{ branches: {label, test}[], inputs: number[] }` | given rules + input, light up the branch that runs | M |
| `code_tracer` | `{ code: string, trace: {line, vars: Record<string,string>, output?: string}[] }` | step a program; show variable table + output per step (generalizes `loop_visualizer`) | L |

**Acceptance:** each widget's config schema strict-parses; widget completes and
unlocks the next panel; a config unit test exists; visuals respect dark mode and
`prefers-reduced-motion`.

### 5.3 New problem type — `parsons_problem`

> Build in Phase C (D4). Defer if D4 = defer.

- **Wiring:** add `'parsons_problem'` to `STEP_TYPES` and the step union in
  `src/content/schemas.ts`; register in `registry.ts`.
- **Config schema** (`src/problem-types/parsons_problem/schema.ts`):
  ```ts
  { prompt: string,
    lines: { id: string, code: string, indent: number }[], // shown scrambled
    distractors?: { id, code, indent }[],                   // optional wrong lines
    checkIndent?: boolean,                                   // default true
    run?: boolean }                                          // optionally execute + output-grade
  ```
- **Component** (`ParsonsProblemStep.tsx`): dnd-kit vertical reorder (+ indent
  controls if `checkIndent`); **Check** button.
- **Grader** (`src/lib/grading/parsonsGrader.ts`): compare ordered ids (and
  indent) to the correct sequence; if `run`, compile to source and output-grade.
- **Acceptance:** correct order passes; wrong order fails with a hint; grader has
  unit tests; integrates with step `graded`/points.

### 5.4 Grading & diagnostics

- **`requiredConstructs`** — generalize `requireLoop`:
  - Add `requiredConstructs?: ('loop'|'modulo'|'conditional')[]` to
    `blockProblemConfigSchema` and `pythonSandboxConfigSchema` (keep `requireLoop`
    as a backward-compatible alias that maps to `['loop']`).
  - Detectors:
    - Source (`loopCheck.ts` or new `constructCheck.ts`): `usesLoopSource`
      (exists), `usesModuloSource` (`%` outside strings/comments),
      `usesConditionalSource` (`\bif\b`).
    - Block AST (`analysis.ts`): `usesLoopNode` (exists), `usesModuloNode`,
      `usesConditionalNode`.
  - Wire into `gradePython` and `gradeBlocks` options; surface a learner-facing
    message per missing construct ("Right answer — now do it with a loop / using
    `%` / with an `if`.").
- **Diagnostics** (`src/lib/grading/diagnostics.ts`): add hints for
  missing colon after `if/for/else`, `=` used where `==` is meant, `elif/else`
  without a preceding `if`, indentation errors under `if/for`, and comparing a
  string to a number.
- **Acceptance:** detector unit tests (positive + string/comment false-positive
  cases); `requiredConstructs` blocks a hardcoded-output cheat; new diagnostics
  covered by tests.

### 5.5 Content authoring

- One file per lesson in `src/content/lessons/`; register in `lessons/index.ts`
  with explicit **ordering** (home page lists in sequence).
- Match step `graded` to whether wrong answers should block completion + decay
  points. Capstone step: `graded: true`, `requiredConstructs: ['loop','modulo','conditional']`,
  multiple `testCases`.
- Validate via the existing content validation (`validate.ts` / npm script).

---

## 6. Phased build plan (with checklists)

### Phase A — Engine & grading foundations
- [ ] `select` field kind (definitions + BlockView + workspace) *(skip if D1=b)*
- [ ] Recursive compiler indentation + triple-nesting test *(skip if D1=b)*
- [ ] Blocks: `assign`, `binop`, `compare`, `if_block`, `elif_block`, `else_block`, `range_n` *(skip if D1=b)*
- [ ] `analysis.ts`: `usesModuloNode`, `usesConditionalNode` *(skip if D1=b)*
- [ ] `requiredConstructs` schema + source detectors + grader wiring
- [ ] Unit tests for all of the above

### Phase B — Article widgets
- [ ] `function_machine`
- [ ] `variable_box`
- [ ] `type_sorter`
- [ ] `remainder_machine`
- [ ] `multiples_grid`
- [ ] `comparison_explorer`
- [ ] `branch_visualizer`
- [ ] `code_tracer`
- [ ] Config-schema tests for each

### Phase C — Parsons problem type *(if D4=build)*
- [ ] `STEP_TYPES` + step union + registry entry
- [ ] `parsons_problem/schema.ts` + `ParsonsProblemStep.tsx`
- [ ] `parsonsGrader.ts` + tests
- [ ] New diagnostics + tests

### Phase D — Author lessons & ship
- [ ] L1 Talking to the Computer
- [ ] L2 Boxes that Remember
- [ ] L3 Doing the Math
- [ ] L4 True or False
- [ ] L5 Making Decisions
- [ ] L6 refit *Over and Over Again* (resequence; add `range_n`)
- [ ] L7 Loops + Decisions Together
- [ ] L8 Build Your Own Machine
- [ ] L9 Capstone — FizzBuzzPop (graded, `requiredConstructs`)
- [ ] Lesson ordering in `lessons/index.ts`
- [ ] Content validation passes for all lessons
- [ ] Manual test docs under `tests/manual/`

---

## 7. Test gate (run before considering a phase done)

- [ ] `npx tsc -b` clean
- [ ] `npm run lint` clean
- [ ] `npm test` (unit) green
- [ ] `npm run test:pyodide` green (includes FizzBuzzPop reference + graded cases)
- [ ] `npx vitest run --config vitest.emulator.config.ts` green
- [ ] `npm run build` succeeds

---

## 8. Smallest viable path (if D1 = b)

Teach L2–L5 and L8 in `python_sandbox` with strong scaffolding (starter code +
test cases + diagnostics); keep blocks for loops only.

- **Phase A** shrinks to: `requiredConstructs` + source detectors only.
- **Must-have widgets** become just `remainder_machine`, `branch_visualizer`,
  `code_tracer` (others optional/nice-to-have).
- **Parsons** becomes optional.
- Lesson authoring (Phase D) is unchanged.

---

## 9. Progress tracker

| Area | Status | Notes |
|------|--------|-------|
| Decisions (D1–D4) | ✅ done | D1=blocks, D2=3/5/7, D3=fixed n=21, D4=build parsons |
| Phase A — engine & grading | ✅ done | select field, recursive indent (`withBody`), assign/if/elif/else/compare/binop/range_n, node+source detectors, `requiredConstructs` (requireLoop alias), extended diagnostics |
| Phase B — widgets | ✅ done | function_machine, variable_box, type_sorter, remainder_machine, multiples_grid, comparison_explorer, branch_visualizer, code_tracer |
| Phase C — parsons | ✅ done | `parsons_problem` type + grader + bank/solution UI (move/indent), registered |
| Phase D — lessons | ✅ done | L1–L9 authored; L6 refit; registered in order in `lessons/index.ts` |
| Test gate | 🟡 mostly green | tsc, lint, unit (185), pyodide (14), build all pass. Emulator tests not run locally (no Java) — unaffected by this work. |

Legend: ⬜ not started · 🟡 in progress · ✅ done

---

## 10. Decisions log

- _2026-06-24_ — Spec created from the curriculum canvas. Loops intentionally
  moved to L6 (after output/variables/math/booleans/conditionals) because
  FizzBuzz depends on those first. Capstone uses the string-building solution so
  every divisor combination is handled and string concatenation (taught in L7)
  is reinforced.
- _2026-06-24_ — Decisions locked: D1 = extend the block engine (L2–L5/L7
  block-based), D2 = divisors 3/5/7, D3 = fixed `n = 21` / `range(1, n + 1)`,
  D4 = build the Parsons problem type. `requireLoop` kept as a backward-compatible
  alias of `requiredConstructs: ['loop']`. Build started (Phase A).
- _2026-06-24_ — Build complete. Phases A–D shipped: block engine extended
  (`select` field + inline operator dropdown, recursive `withBody` indentation,
  `assign`/`if_block`/`elif_block`/`else_block`/`compare`/`binop`/`range_n`),
  node/source construct detectors + generalized `requiredConstructs` grading,
  extended diagnostics, the `parsons_problem` type, 8 article widgets, and
  lessons L1–L9 (L6 refit). Fixed an empty-string bug (`str` block compiled `""`
  to `"Hello!"` via the shared `field` fallback) — critical for `label = ""`.
  Gate: tsc + lint + 185 unit + 14 pyodide + build all green; emulator tests not
  run (no local Java) and unaffected. Coverage matrix is enforced by
  `tests/phase-9-curriculum/capstone-coverage.test.ts`.
