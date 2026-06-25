import { StrictMode } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { gradeParsons } from '../../src/lib/grading/parsonsGrader'
import { ParsonsProblemStep } from '../../src/problem-types/parsons_problem/ParsonsProblemStep'
import type { Step } from '../../src/content/schemas'

describe('[Phase 9] parsons grader', () => {
  const solution = [
    { id: 'a', indent: 0 },
    { id: 'b', indent: 1 },
    { id: 'c', indent: 0 },
  ]

  it('accepts the correct order and indentation', () => {
    expect(gradeParsons(solution, solution).correct).toBe(true)
  })

  it('rejects a wrong order', () => {
    const attempt = [solution[1], solution[0], solution[2]]
    const res = gradeParsons(attempt, solution)
    expect(res.correct).toBe(false)
    expect(res.orderCorrect).toBe(false)
  })

  it('rejects correct order with wrong indentation when checkIndent is on', () => {
    const attempt = [
      { id: 'a', indent: 0 },
      { id: 'b', indent: 0 },
      { id: 'c', indent: 0 },
    ]
    const res = gradeParsons(attempt, solution, true)
    expect(res.orderCorrect).toBe(true)
    expect(res.indentCorrect).toBe(false)
    expect(res.correct).toBe(false)
  })

  it('ignores indentation when checkIndent is off', () => {
    const attempt = [
      { id: 'a', indent: 0 },
      { id: 'b', indent: 0 },
      { id: 'c', indent: 0 },
    ]
    expect(gradeParsons(attempt, solution, false).correct).toBe(true)
  })
})

const step: Step = {
  id: 'order-it',
  type: 'parsons_problem',
  title: 'Order the loop',
  graded: true,
  points: 100,
  minPoints: 20,
  config: {
    prompt: 'Put the lines in order.',
    checkIndent: true,
    distractors: [],
    lines: [
      { id: 'for', code: 'for i in range(3):', indent: 0 },
      { id: 'print', code: 'print(i)', indent: 1 },
    ],
  },
}

describe('[Phase 9] ParsonsProblemStep component', () => {
  it('completes when lines are placed in the correct order and indent', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<ParsonsProblemStep step={step} onComplete={onComplete} />)

    await user.click(screen.getByLabelText('Add for i in range(3):'))
    await user.click(screen.getByLabelText('Add print(i)'))
    // Indent the second line (print) one level.
    const indentButtons = screen.getAllByLabelText('Indent')
    await user.click(indentButtons[1])

    await user.click(screen.getByRole('button', { name: /check/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/right order/i)).toBeInTheDocument()
  })

  it('removing a placed line returns it to the bank exactly once (StrictMode-safe, pure updaters)', async () => {
    const user = userEvent.setup()
    // StrictMode double-invokes state updaters to surface impurity; the old
    // removeFromSolution called setBank inside the setSolution updater, so the
    // removed line was added back to the bank TWICE. Guard against regressing.
    render(
      <StrictMode>
        <ParsonsProblemStep step={step} onComplete={vi.fn()} />
      </StrictMode>,
    )

    await user.click(screen.getByLabelText('Add print(i)'))
    expect(screen.queryAllByLabelText('Add print(i)')).toHaveLength(0)

    await user.click(screen.getByLabelText('Remove'))
    // Exactly one copy back in the bank — not two.
    expect(screen.queryAllByLabelText('Add print(i)')).toHaveLength(1)
  })

  it('does not complete with the wrong order', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<ParsonsProblemStep step={step} onComplete={onComplete} />)

    await user.click(screen.getByLabelText('Add print(i)'))
    await user.click(screen.getByLabelText('Add for i in range(3):'))
    await user.click(screen.getByRole('button', { name: /check/i }))

    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByText(/check the order/i)).toBeInTheDocument()
  })
})
