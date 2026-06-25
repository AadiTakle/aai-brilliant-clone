// Turns a failed run into a learner-friendly hint. Error-based hints (missing
// quote, bad indent, undefined name) read the Python stderr and are reliable.
// Off-by-one is a heuristic over the expected/actual output (numeric sequences
// and line-count differences). Returns null when nothing specific applies, so
// callers fall back to expected-vs-actual + authored feedback.

import { normalizeOutput } from './outputGrader'
import {
  usesAccumulatorSource,
  usesConditionalSource,
  usesLoopSource,
  usesModuloSource,
} from './constructCheck'

export interface DiagnoseInput {
  expected?: string
  actual?: string
  stderr?: string | null
  /** The learner's source, used to refine syntax-error hints. */
  source?: string
  /**
   * The kind of step being graded. When set, enables beginner-friendly,
   * failure-type-specific hints (empty output vs. wrong text). Kept optional so
   * existing callers are unaffected.
   */
  kind?: 'block' | 'python'
}

function toLines(text: string | undefined): string[] {
  if (!text) return []
  const normalized = normalizeOutput(text)
  return normalized === '' ? [] : normalized.split('\n')
}

// Header keywords whose lines must end with a colon.
const HEADER_RE = /^\s*(if|elif|else|for|while|def)\b/

/** Refine a syntax error using the learner's source. */
function diagnoseSource(source: string): string | null {
  const lines = source.split('\n')

  // A block header (if/for/else/...) missing its trailing colon.
  for (const line of lines) {
    const code = line.replace(/#.*$/, '').replace(/\s+$/, '')
    if (code && HEADER_RE.test(code) && !code.endsWith(':')) {
      return 'Add a colon (:) at the end of the line — `if`, `for`, `else` and friends end with `:`.'
    }
  }

  // A single `=` used where a comparison `==` was meant, inside a condition.
  for (const line of lines) {
    const code = line.replace(/#.*$/, '')
    if (/^\s*(if|elif|while)\b/.test(code) && /[^=!<>]=[^=]/.test(code)) {
      return 'Use `==` to compare values. A single `=` stores a value; `==` asks "are these equal?".'
    }
  }

  // `elif`/`else` with no `if` to attach to.
  const hasIf = lines.some((l) => /^\s*if\b/.test(l))
  const hasElse = lines.some((l) => /^\s*(elif|else)\b/.test(l))
  if (hasElse && !hasIf) {
    return '`elif` and `else` must come right after an `if` block.'
  }

  return null
}

function diagnoseError(stderr: string, source?: string): string | null {
  const e = stderr.toLowerCase()

  if (e.includes('unterminated string') || e.includes('eol while scanning string literal')) {
    return 'It looks like a quote is missing — text needs matching quotes on both sides, like "hello".'
  }
  if (
    e.includes('indentationerror') ||
    e.includes('expected an indented block') ||
    e.includes('unexpected indent')
  ) {
    return 'Check your indentation — the lines inside a loop or an if must be indented (4 spaces).'
  }
  if (e.includes("expected ':'")) {
    return 'Add a colon (:) at the end of the line — `if`, `for`, `else` and friends end with `:`.'
  }
  if (e.includes('not supported between instances of')) {
    return "You're comparing different types — make sure both sides are numbers (use int(...)) or both are text."
  }
  const nameMatch = stderr.match(/name '([^']+)' is not defined/)
  if (nameMatch) {
    return `Python doesn't recognize \`${nameMatch[1]}\`. Check the spelling, or define it before you use it.`
  }
  if (e.includes('syntaxerror') || e.includes('invalid syntax')) {
    if (source) {
      const fromSource = diagnoseSource(source)
      if (fromSource) return fromSource
    }
    return 'There is a syntax error — check for a missing colon (:) at the end of a header line or a missing parenthesis.'
  }
  return null
}

function diagnoseOutput(expected: string, actual: string): string | null {
  const exp = toLines(expected)
  const act = toLines(actual)
  if (exp.length === 0 || act.length === 0) return null

  // "All run together": the expected output separates its pieces with spaces, but
  // the learner's output is the SAME characters with the separators missing (e.g.
  // expected "0 3 6 9", got "0369"). Point at the missing separator without ever
  // echoing the expected sequence.
  const expNorm = normalizeOutput(expected)
  const actNorm = normalizeOutput(actual)
  if (
    /\s/.test(expNorm) &&
    !/\s/.test(actNorm) &&
    expNorm.replace(/\s+/g, '') === actNorm.replace(/\s+/g, '')
  ) {
    return 'Your values are all run together — make sure you add a space between each one as you build up the text.'
  }

  const expNums = exp.map(Number)
  const actNums = act.map(Number)
  const allInts = (xs: number[]) => xs.every((x) => Number.isInteger(x))

  if (allInts(expNums) && allInts(actNums)) {
    if (exp.length === act.length && actNums.every((n, i) => n === expNums[i] + 1)) {
      return 'Off by one: your numbers start one too high — check the start of your range.'
    }
    if (exp.length === act.length && actNums.every((n, i) => n === expNums[i] - 1)) {
      return 'Off by one: your numbers start one too low — check the start of your range.'
    }
    if (Math.abs(exp.length - act.length) === 1) {
      return act.length > exp.length
        ? 'Off by one: one number too many — remember range stops one before its end value.'
        : 'Off by one: one number too few — range stops one before its end value, so you may need a larger stop.'
    }
  }

  if (Math.abs(exp.length - act.length) === 1) {
    return act.length > exp.length
      ? 'You printed one line too many — check how many times your loop runs.'
      : 'You printed one line too few — check how many times your loop runs.'
  }

  return null
}

/**
 * Beginner-friendly hint that distinguishes "your program printed nothing" from
 * "your program printed the wrong text". Never reveals the expected answer — it
 * only points the learner at what to look at. Only used when a step `kind` is
 * provided.
 */
function diagnoseKind(kind: 'block' | 'python', expected: string, actual: string): string | null {
  // No advice when nothing is expected to be printed.
  if (normalizeOutput(expected) === '') return null
  if (normalizeOutput(actual) === '') {
    return kind === 'block'
      ? "Your program didn't print anything yet — add a print block so it shows something on the screen."
      : "Your program didn't print anything yet — add a line that makes it print something."
  }
  return "That's not the text we're looking for yet — check the words inside your print, letter by letter, against the goal."
}

// --- L9 capstone: earned, one-at-a-time, element-aware hints -----------------
// The FizzBuzzPop finale withholds the "how" until the learner gets it wrong.
// Each wrong submission earns EXACTLY ONE nudge, chosen by what is missing in
// the learner's source — in priority order loop -> conditional -> modulo ->
// label. When all four are present the output is wrong for a logic reason, so we
// give a single answer-free "trace it by hand" nudge. No nudge ever reveals the
// expected output or the exact algorithm.

// The capstone is the only place Fizz/Buzz/Pop appear by name, so an expected
// output mentioning all three uniquely identifies it without any new wiring.
function isFizzBuzzPopProblem(expected: string | undefined): boolean {
  if (!expected) return false
  return expected.includes('Fizz') && expected.includes('Buzz') && expected.includes('Pop')
}

const TRACE_NUDGE =
  'Your pieces are all there. Trace a tricky number like 15 or 21 by hand — check it against every rule in order — and compare that to what your code does.'

/**
 * Returns the single highest-priority "missing element" nudge for the capstone,
 * or null when the loop, conditional, modulo, and label are all present.
 */
function firstMissingElementHint(source: string): string | null {
  if (!usesLoopSource(source)) {
    return 'Nothing repeats for each number yet — wrap your work in a loop so it runs once for every number from 1 to 21.'
  }
  if (!usesConditionalSource(source)) {
    return 'You need to make decisions — use an `if` to check each rule (multiple of 3? of 5? of 7?).'
  }
  if (!usesModuloSource(source)) {
    return 'How can you tell if a number is a multiple of 3? Use the % (remainder) operator — a remainder of 0 means it divides evenly.'
  }
  if (!usesAccumulatorSource(source)) {
    return 'A number can match more than one rule (like 15). Instead of printing right away, build up a text label as you check each rule, then decide what to print.'
  }
  return null
}

function diagnoseCapstone(input: DiagnoseInput): string | null {
  if (input.source === undefined) return null
  // Element-first: name the one missing building block, one at a time.
  const elementHint = firstMissingElementHint(input.source)
  if (elementHint) return elementHint
  // All four building blocks are present, so it's a logic bug. Prefer a precise
  // error hint if Python actually errored; otherwise a single generic nudge.
  if (input.stderr) {
    const fromError = diagnoseError(input.stderr, input.source)
    if (fromError) return fromError
  }
  return TRACE_NUDGE
}

export function diagnose(input: DiagnoseInput): string | null {
  if (input.kind === 'python' && isFizzBuzzPopProblem(input.expected)) {
    return diagnoseCapstone(input)
  }
  if (input.stderr) {
    const fromError = diagnoseError(input.stderr, input.source)
    if (fromError) return fromError
  }
  if (input.expected !== undefined && input.actual !== undefined) {
    const fromOutput = diagnoseOutput(input.expected, input.actual)
    if (fromOutput) return fromOutput
    if (input.kind) return diagnoseKind(input.kind, input.expected, input.actual)
  }
  return null
}
