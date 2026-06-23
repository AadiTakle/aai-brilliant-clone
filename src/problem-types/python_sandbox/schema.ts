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
})

export type PythonSandboxConfig = z.infer<typeof pythonSandboxConfigSchema>
export type PythonTestCase = z.infer<typeof pythonTestCaseSchema>
