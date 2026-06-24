# Phase 9 — Python-from-scratch curriculum (manual checks)

Run `npm run dev:local` (emulators + Vite) and sign in with a test account. The
home page should list **nine** lessons in this order:

1. Talking to the Computer
2. Boxes that Remember
3. Doing the Math
4. True or False
5. Making Decisions
6. Over and Over Again
7. Loops and Decisions
8. Build Your Own Machine
9. FizzBuzzPop

## A. New block types
- In any block step, blocks expand **horizontally** and leaf values (names,
  numbers, text, the empty string) are inline-editable; only nesting slots
  (if-condition, loop sequence, statement bodies) are drop targets.
- `assign` renders `▢ = ▢`; `if`/`elif`/`else` render with indented bodies;
  `compare` and `binop` show an inline **operator dropdown** (e.g. `==`, `%`).
- Edit the operator dropdown in a `compare`/`binop` block → the compiled Python
  and output update on Run.

## B. New article widgets (each unlocks Continue when finished)
- **function_machine** (L1, L8): Run feeds an input through; output appears.
- **variable_box** (L2): storing a new value replaces the old.
- **type_sorter** (L2): completes only when every item is sorted number/text.
- **remainder_machine** (L3): step n; remainder hits 0 on multiples.
- **multiples_grid** (L3): tap exactly the multiples of the factor.
- **comparison_explorer** (L4): make it show both True and False.
- **branch_visualizer** (L5): step n; the first matching branch highlights.
- **code_tracer** (L7): step through; current line + variables + output update.

## C. Parsons problems (L5, L7)
- Lines start scrambled in **Available lines**. Tap **Add →** to move a line into
  **Your program**; use ↑/↓ to reorder and ⇤/⇥ to indent.
- Wrong order → "check the order"; right order but wrong indent → "check the
  indentation"; correct → passes and unlocks Next.

## D. requiredConstructs enforcement
- L3 typed remainder + L9 capstone require specific constructs.
- In the **FizzBuzzPop** capstone, paste 21 hardcoded `print(...)` lines with the
  exact expected output → it should **fail** with a hint to use a loop (and `%`,
  and an `if`). Re-solve with a real loop + `%` + `if` → passes.

## E. Capstone coverage
- The capstone is solvable using only ideas taught in L1–L8: `print`, strings,
  `n = 21`, `%`, string `+` concatenation, comparisons, `if/else`, a `for` loop
  over `range(1, n + 1)`, and the `label = label + "..."` accumulator.
- Reference solution (for graders):

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

## Automated coverage
- `npm test` — unit suite (engine, graders, diagnostics, parsons, widgets,
  coverage matrix → lessons, content validation).
- `npm run test:pyodide` — runs the reference solution and the run-only block
  lessons under real Python and checks the capstone contract.
