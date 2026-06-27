// Shared "did the learner actually use X?" checks. A graded step can require
// one or more constructs so a correct-looking output cannot be faked (e.g.
// stacking prints instead of looping, or hardcoding instead of using `%`).
//
// Source-level detectors strip strings/comments first (see loopCheck) so a
// keyword inside a string literal does not count. Block-level detectors live in
// blocks/analysis.ts and walk the block AST.

import { stripStringsAndComments, usesLoopSource } from './loopCheck'

export { usesLoopSource }

export type Construct = 'loop' | 'modulo' | 'conditional'

export function usesModuloSource(source: string): boolean {
  return /%/.test(stripStringsAndComments(source))
}

export function usesConditionalSource(source: string): boolean {
  return /\bif\b/.test(stripStringsAndComments(source))
}

/**
 * Detects an accumulator / "label" pattern: a variable that is built up from
 * itself. Catches both `label = label + ...` and `label += ...`. Strings and
 * comments are removed first so the words inside a printed string don't count.
 * Not a `Construct` (the grader's enforced set stays loop/modulo/conditional);
 * this is used only to power the capstone's earned "build a label" hint.
 */
export function usesAccumulatorSource(source: string): boolean {
  const s = stripStringsAndComments(source)
  // `name = name + ...` (same identifier on both sides, then a +).
  if (/(\b\w+)\s*=\s*\1\b\s*\+/.test(s)) return true
  // `name += ...`
  if (/\b\w+\s*\+=/.test(s)) return true
  return false
}

const SOURCE_DETECTORS: Record<Construct, (source: string) => boolean> = {
  loop: usesLoopSource,
  modulo: usesModuloSource,
  conditional: usesConditionalSource,
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Does `source` reference `name` as a standalone identifier/keyword? Strings and
 * comments are stripped first, and the match excludes attribute access (so
 * `obj.sum` does not count as `sum`) and longer identifiers (`mysum`). Used for
 * both the disallowed and required name checks.
 */
export function usesNameSource(source: string, name: string): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  const stripped = stripStringsAndComments(source)
  const re = new RegExp(`(?:^|[^\\w.])${escapeRegExp(trimmed)}(?![\\w])`)
  return re.test(stripped)
}

/** Banned identifiers that nonetheless appear in the source. */
export function findDisallowedNames(source: string, disallowed: string[]): string[] {
  return disallowed.filter((n) => n.trim() && usesNameSource(source, n))
}

/** Required identifiers that are missing from the source. */
export function findMissingRequiredNames(source: string, required: string[]): string[] {
  return required.filter((n) => n.trim() && !usesNameSource(source, n))
}

/**
 * Heuristic anti-hardcoding check: is any line of `expectedStdout` printed as a
 * bare literal — print(30) / print("READY") / print('30') — rather than computed?
 * Runs on the raw source (not stripped) so quoted answers are caught too.
 */
export function printsLiteralOutput(source: string, expectedStdout: string): boolean {
  const lines = expectedStdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return false
  return lines.some((line) => {
    const esc = escapeRegExp(line)
    // print( "line" | 'line' | line )  — the exact answer typed in directly.
    const re = new RegExp(`print\\s*\\(\\s*(["']?)${esc}\\1\\s*\\)`)
    return re.test(source)
  })
}

/** A short, answer-free nudge for a failed extra constraint (name/hardcode). */
export function extraConstraintHint(opts: {
  disallowedUsed?: string[]
  requiredMissing?: string[]
  hardcodedOutput?: boolean
}): string {
  if (opts.hardcodedOutput) {
    return 'Right output, but compute it in code — print a variable you calculated, not the answer typed in directly.'
  }
  const disallowed = opts.disallowedUsed ?? []
  if (disallowed.length > 0) {
    return `This one doesn't allow ${disallowed.join(', ')} — solve it a different way.`
  }
  const missing = opts.requiredMissing ?? []
  if (missing.length > 0) {
    return `Use ${missing.join(', ')} in your solution.`
  }
  return ''
}

/**
 * Combine the legacy `requireLoop` flag with an explicit `requiredConstructs`
 * list into a de-duplicated set.
 */
export function effectiveConstructs(options: {
  requireLoop?: boolean
  requiredConstructs?: Construct[]
}): Construct[] {
  const set = new Set<Construct>(options.requiredConstructs ?? [])
  if (options.requireLoop) set.add('loop')
  return [...set]
}

/** Which required constructs are missing from Python source. */
export function missingConstructsSource(source: string, required: Construct[]): Construct[] {
  return required.filter((c) => !SOURCE_DETECTORS[c](source))
}

/** A short, learner-friendly nudge naming the missing construct(s). */
export function constructHint(missing: Construct[]): string {
  const phrases: Record<Construct, string> = {
    loop: 'solve it with a loop instead of writing each line',
    modulo: 'use the % (remainder) operator to test divisibility',
    conditional: 'use an if statement to decide what to do',
  }
  if (missing.length === 0) return ''
  const list = missing.map((m) => phrases[m])
  const joined =
    list.length === 1
      ? list[0]
      : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
  return `Right answer, but ${joined}.`
}
