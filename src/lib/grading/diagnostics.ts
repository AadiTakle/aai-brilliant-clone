// Turns a failed run into a learner-friendly hint. Error-based hints (missing
// quote, bad indent, undefined name) read the Python stderr and are reliable.
// Off-by-one is a heuristic over the expected/actual output (numeric sequences
// and line-count differences). Returns null when nothing specific applies, so
// callers fall back to expected-vs-actual + authored feedback.

import { normalizeOutput } from './outputGrader'

export interface DiagnoseInput {
  expected?: string
  actual?: string
  stderr?: string | null
  /** The learner's source, used to refine syntax-error hints. */
  source?: string
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

export function diagnose(input: DiagnoseInput): string | null {
  if (input.stderr) {
    const fromError = diagnoseError(input.stderr, input.source)
    if (fromError) return fromError
  }
  if (input.expected !== undefined && input.actual !== undefined) {
    return diagnoseOutput(input.expected, input.actual)
  }
  return null
}
