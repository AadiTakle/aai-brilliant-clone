// The contract the model follows when generating a lesson's Mastery Challenge
// "Apply" questions. These are short, graded python_sandbox problems weighted
// toward the concepts a learner just struggled with. The client re-validates the
// shape AND self-tests the model's own reference solution in Pyodide before
// trusting a question — falling back to the lesson's authored static Apply on any
// failure — so this is the first line of defense, not the only one.

export const MAX_MASTERY_QUESTIONS = 2

// Human-readable hints for each concept tag, so the model gets real guidance
// from the abstract vocabulary the client sends.
const CONCEPT_HINTS: Record<string, string> = {
  print: 'printing text/values with print()',
  variable: 'storing and reusing values in variables',
  modulo: 'the remainder operator % (multiples / divisibility)',
  comparison: 'comparisons that produce True/False (==, >, <)',
  conditional: 'branching with if / elif / else',
  loop: 'repeating work with a for loop over range()',
  range: 'generating number sequences with range()',
  accumulator: 'building a string or total up across a loop',
  function: 'defining and calling functions with def / return',
}

export const MASTERY_SYSTEM_PROMPT = `You write short Python coding challenges to confirm a beginner has MASTERED a lesson they just finished. Each challenge is a single self-contained "python_sandbox" problem the learner solves from scratch.

RULES:
- Stay strictly within beginner Python: print(), variables, math and the % operator, comparisons, if/elif/else, for loops over range(), simple string building, and basic functions. NEVER require input(), files, imports, classes, libraries, or anything not in that list.
- Each question targets the CONCEPTS you are given. Weight the questions toward those concepts — they are exactly what the learner struggled with.
- Make each "prompt" VERBOSE and self-contained: state precisely what to print/return, with concrete example values, so the learner never has to guess the spec. Do not reveal the solution code.
- Output the learner can actually produce deterministically (no randomness, no current date/time).
- Every question MUST include at least one test case. Every test case MUST have an "expectedStdout" and a "feedback" string that nudges toward the fix WITHOUT revealing the answer.
- When a concept implies a construct, set "requiredConstructs" (any of "loop", "modulo", "conditional") so a hardcoded answer cannot pass.
- OPTIONAL anti-shortcut constraints — use them to make the challenge real, but only when a valid beginner solution still exists, and never disallow something you also require:
  • "forbidHardcodedOutput": true — the answer must be computed, not printed as a literal (print(30) / print("READY") fail). Use when the point is to calculate a value.
  • "requiredNames": [..] — identifiers the solution MUST use (e.g. ["total"] for a named variable, ["def"] to require a function).
  • "disallowedNames": [..] — functions/keywords the solution may NOT use (e.g. ["sum"], ["while"], ["import"]).
- Every question MUST include a correct "referenceSolution": runnable Python that, when executed, prints EXACTLY each test case's expectedStdout, genuinely uses every requiredConstruct, AND obeys every extra constraint (computes the answer, uses each requiredName, avoids each disallowedName). This is self-tested against ALL of those; if your reference solution does not pass, the question is thrown away.
- Keep "starterCode" minimal (a comment and any given setup line) — never include the answer.

Set "accepted": false with a short kind "reason" only if you genuinely cannot make a valid beginner question for the given concepts. Otherwise return "accepted": true and the "questions" array. Output JSON ONLY.`

export function buildMasteryUserMessage(concepts: string[], count: number): string {
  const n = Math.max(1, Math.min(MAX_MASTERY_QUESTIONS, Math.floor(count) || 1))
  const described = concepts
    .map((c) => `- ${c}: ${CONCEPT_HINTS[c] ?? c}`)
    .join('\n')
  return `Generate exactly ${n} mastery "Apply" question${n === 1 ? '' : 's'} that review these concepts:\n${described}\n\nMake each question solvable in a few lines by a beginner who just learned these. Remember: verbose prompt, at least one test case with feedback, requiredConstructs where relevant, and a referenceSolution that passes its own test cases.`
}

export function buildMasteryResponseSchema() {
  const STR = { type: 'string' }
  const testCase = {
    type: 'object',
    properties: {
      stdin: STR,
      expectedStdout: STR,
      feedback: STR,
    },
    required: ['expectedStdout', 'feedback'],
  }
  const question = {
    type: 'object',
    properties: {
      prompt: STR,
      starterCode: STR,
      requiredConstructs: {
        type: 'array',
        items: { type: 'string', enum: ['loop', 'modulo', 'conditional'] },
      },
      disallowedNames: { type: 'array', items: STR },
      requiredNames: { type: 'array', items: STR },
      forbidHardcodedOutput: { type: 'boolean' },
      testCases: { type: 'array', items: testCase, minItems: 1 },
      referenceSolution: STR,
      concepts: { type: 'array', items: STR },
    },
    required: ['prompt', 'testCases', 'referenceSolution'],
  }
  return {
    type: 'object',
    properties: {
      accepted: { type: 'boolean' },
      reason: STR,
      questions: {
        type: 'array',
        minItems: 1,
        maxItems: MAX_MASTERY_QUESTIONS,
        items: question,
      },
    },
    required: ['accepted'],
  }
}
