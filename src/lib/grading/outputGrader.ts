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

export function gradeOutput(actual: string, expected: string): GradeResult {
  return {
    correct: normalizeOutput(actual) === normalizeOutput(expected),
    actual,
    expected,
  }
}
