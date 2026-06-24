// Grades a Parsons problem: the learner arranges scrambled code lines into the
// correct order (and, optionally, the correct indentation). Pure + synchronous
// so it is trivial to unit test; no Python execution required.

export interface ParsonsLineAttempt {
  id: string
  indent: number
}

export interface ParsonsSolutionLine {
  id: string
  indent: number
}

export interface ParsonsGradeResult {
  correct: boolean
  orderCorrect: boolean
  indentCorrect: boolean
}

export function gradeParsons(
  attempt: ParsonsLineAttempt[],
  solution: ParsonsSolutionLine[],
  checkIndent = true,
): ParsonsGradeResult {
  const orderCorrect =
    attempt.length === solution.length && attempt.every((a, i) => a.id === solution[i].id)
  const indentCorrect = orderCorrect && attempt.every((a, i) => a.indent === solution[i].indent)
  const correct = orderCorrect && (!checkIndent || indentCorrect)
  return { correct, orderCorrect, indentCorrect }
}
