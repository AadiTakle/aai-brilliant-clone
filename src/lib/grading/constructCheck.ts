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
