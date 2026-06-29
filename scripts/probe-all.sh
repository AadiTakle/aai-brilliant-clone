#!/usr/bin/env bash
# Runs every custom-lesson verification prompt through scripts/probe-lesson.ts and
# saves each result to probe-results/. Requires OPENAI_API_KEY in the environment
# (it is read from process.env, never from .env).
#
#   export OPENAI_API_KEY=sk-...
#   bash scripts/probe-all.sh
#
# Each run lands in probe-results/<NN>-<slug>.txt (the dir is gitignored), and a
# pass/fail summary is printed at the end.

set -uo pipefail

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "OPENAI_API_KEY is not set. First run:  export OPENAI_API_KEY=sk-..." >&2
  exit 1
fi

OUT_DIR="probe-results"
mkdir -p "$OUT_DIR"

run() {
  # $1 = output filename (within OUT_DIR); remaining args go to probe:lesson.
  local file="$OUT_DIR/$1"; shift
  echo ">>> probe:lesson $*  ->  $file"
  npm run --silent probe:lesson -- "$@" 2>&1 | tee "$file"
  echo
}

# Content prompts run through the FULL self-heal loop (validate + Pyodide self-test
# + repair / simple-mode fallback) — this is exactly what the app does, so each
# result is the lesson a learner would actually get. Single-shot rejections are
# expected model slips the loop repairs; to inspect one raw response, run a single
# prompt with `npm run probe:lesson -- "<prompt>"` (optionally --raw).
run "01-remainder.txt"          "how does the % remainder operator work" --loop
run "02-sum-loop.txt"           "add up the numbers 1 to 10 with a loop" --loop
run "03-def-return.txt"         "write your first function with def and return" --loop
run "04-times-table.txt"        "print the 7 times table from 1 to 5" --loop
run "05-round-decimals.txt"     "round 3.14159 to two decimals and print it" --loop

# Should be refused (no lesson to repair, so a single shot is enough).
run "06-refuse-website.txt"     "build me a website"
run "07-refuse-ml.txt"          "teach me machine learning with neural networks"

echo "=================== SUMMARY ==================="
grep -aHE "ACCEPTED|REJECTED|Model REFUSED|REJECTED at|did not pass" "$OUT_DIR"/*.txt \
  | sed "s#${OUT_DIR}/##" \
  || echo "(no accept/reject lines found — check the files)"
echo "All outputs saved in ./$OUT_DIR/"
