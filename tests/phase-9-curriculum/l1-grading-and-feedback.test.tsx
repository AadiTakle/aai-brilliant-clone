import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getLesson } from '../../src/content/loader'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import type { CodeNode } from '../../src/lib/blocks/definitions'
import { BlockProblemStep } from '../../src/problem-types/block_problem/BlockProblemStep'
import { PythonSandboxStep } from '../../src/problem-types/python_sandbox/PythonSandboxStep'

// Mock the Python runner so we can drive output deterministically without Pyodide.
const runPythonMock = vi.fn()
vi.mock('../../src/lib/pyodide/runner', () => ({
  runPython: (...args: unknown[]) => runPythonMock(...args),
  loadPyodideRunner: vi.fn(),
}))

function l1Step(id: string) {
  const lesson = getLesson('l1-talking-to-the-computer')!
  const step = lesson.steps.find((s) => s.id === id)!
  return step
}

beforeEach(() => {
  runPythonMock.mockReset()
})

// --- leniency wired through the real graders (explicit fake runner) -----------
describe('[L1] lenient grading is active on steps 1.2 and 1.3', () => {
  it('1.2 block grader accepts a close-enough output and rejects a wrong one', async () => {
    const step = l1Step('print-a-string')
    if (step.type !== 'block_problem') throw new Error('not block')
    const close = await gradeBlocks(
      step.config.initial as CodeNode[],
      step.config.expectedOutput!,
      async () => ({ stdout: 'good morning', error: null }),
      { lenient: step.config.lenient },
    )
    expect(close.correct).toBe(true)
    const wrong = await gradeBlocks(
      step.config.initial as CodeNode[],
      step.config.expectedOutput!,
      async () => ({ stdout: 'good evening', error: null }),
      { lenient: step.config.lenient },
    )
    expect(wrong.correct).toBe(false)
  })

  it('1.3 python grader accepts a close-enough output and rejects a wrong one', async () => {
    const step = l1Step('first-program')
    if (step.type !== 'python_sandbox') throw new Error('not python')
    const close = await gradePython(
      'print("hello world")',
      step.config.testCases,
      async () => ({ stdout: 'hello world', error: null }),
      { lenient: step.config.lenient },
    )
    expect(close.passed).toBe(true)
    const wrong = await gradePython(
      'print("nope")',
      step.config.testCases,
      async () => ({ stdout: 'goodbye', error: null }),
      { lenient: step.config.lenient },
    )
    expect(wrong.passed).toBe(false)
  })
})

// --- failure-type-specific hints actually surface on the rendered steps -------
describe('[L1] failure hints surface on the rendered steps', () => {
  it('1.2: empty output shows the "add a print block" hint', async () => {
    runPythonMock.mockResolvedValue({ stdout: '', error: null })
    const user = userEvent.setup()
    const { container } = render(<BlockProblemStep step={l1Step('print-a-string')} />)
    await user.click(screen.getByRole('button', { name: /^run$/i }))
    await vi.waitFor(() => {
      const hint = container.querySelector('.feedback-hint')
      expect(hint?.textContent ?? '').toMatch(/print block/i)
    })
  })

  it('1.3: wrong text shows a "check the text" hint and never the answer', async () => {
    runPythonMock.mockResolvedValue({ stdout: 'hello there', error: null })
    const user = userEvent.setup()
    const { container } = render(<PythonSandboxStep step={l1Step('first-program')} />)
    await user.click(screen.getByRole('button', { name: /^run$/i }))
    await vi.waitFor(() => {
      const hint = container.querySelector('.test-result-hint')
      expect(hint?.textContent ?? '').toMatch(/text/i)
    })
    const hint = container.querySelector('.test-result-hint')
    expect(hint?.textContent?.toLowerCase()).not.toContain('hello world')
  })
})

// --- encouraging success message renders on 1.3 ------------------------------
describe('[L1] success message celebrates the first program', () => {
  it('shows the authored success message when the program is correct', async () => {
    runPythonMock.mockResolvedValue({ stdout: 'Hello World!', error: null })
    const user = userEvent.setup()
    const { container } = render(<PythonSandboxStep step={l1Step('first-program')} />)
    await user.click(screen.getByRole('button', { name: /^run$/i }))
    await vi.waitFor(() => {
      const success = container.querySelector('.feedback-correct[role="status"]')
      expect(success?.textContent ?? '').toMatch(/first .*program/i)
    })
  })
})
