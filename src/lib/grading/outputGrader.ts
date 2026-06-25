export interface GradeResult {
  correct: boolean
  actual: string
  expected: string
}

/** Normalize stdout for comparison: trim trailing spaces per line + outer blank lines. */
export function normalizeOutput(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '')
    .replace(/^\n+/, '')
}

/**
 * "Close enough" normalization for beginner steps (opt-in). On top of
 * `normalizeOutput`, it lowercases, collapses runs of inner whitespace to a
 * single space, trims each line, and tolerates trailing punctuation — so
 * "  HELLO   WORLD!! " matches "Hello World!". An empty output stays empty, so
 * a blank program is never "close enough".
 */
export function normalizeLenient(text: string): string {
  return normalizeOutput(text)
    .toLowerCase()
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim().replace(/[.,!?;:]+$/, '').trim())
    .join('\n')
}

export function gradeOutput(
  actual: string,
  expected: string,
  options: { lenient?: boolean } = {},
): GradeResult {
  const normalize = options.lenient ? normalizeLenient : normalizeOutput
  return {
    correct: normalize(actual) === normalize(expected),
    actual,
    expected,
  }
}
