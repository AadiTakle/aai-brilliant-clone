import { z } from 'zod'

export const pythonTestCaseSchema = z.object({
  stdin: z.string().default(''),
  expectedStdout: z.string(),
  feedback: z.string().optional(),
})

export const pythonSandboxConfigSchema = z.object({
  prompt: z.string().min(1),
  starterCode: z.string().default(''),
  // When testCases are present and graded is true, output is checked per case.
  testCases: z.array(pythonTestCaseSchema).default([]),
  // When true, a passing solution must actually use a loop (not hardcoded prints).
  // Kept as a convenience alias of requiredConstructs: ['loop'].
  requireLoop: z.boolean().default(false),
  // A passing solution must actually use each listed construct.
  requiredConstructs: z.array(z.enum(['loop', 'modulo', 'conditional'])).default([]),
  // Identifiers (functions, keywords, or builtins) a passing solution may NOT use,
  // e.g. ["sum", "while", "import"]. Matched as standalone tokens in code (string
  // literals and comments are ignored). Lets a problem forbid a shortcut.
  disallowedNames: z.array(z.string()).default([]),
  // Identifiers a passing solution MUST reference, e.g. a required variable name
  // ["total"]. Matched the same way as disallowedNames.
  requiredNames: z.array(z.string()).default([]),
  // When true, the answer must be COMPUTED, not printed as a literal: a solution
  // that prints a test case's expected output verbatim (e.g. print(30) or
  // print("READY")) fails even if the output matches. Forces "print the variable,
  // not the answer".
  forbidHardcodedOutput: z.boolean().default(false),
  // Opt-in "close enough" grading: ignores case, surrounding whitespace, and
  // trailing punctuation. Off by default so later lessons stay strict.
  lenient: z.boolean().default(false),
  // Optional celebratory message shown when every test passes (e.g. to mark a
  // milestone like a learner's first program).
  successMessage: z.string().optional(),
})

export type PythonSandboxConfig = z.infer<typeof pythonSandboxConfigSchema>
export type PythonTestCase = z.infer<typeof pythonTestCaseSchema>
