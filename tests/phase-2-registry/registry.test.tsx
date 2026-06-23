import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { getRenderer, problemRegistry } from '../../src/problem-types/registry'
import { ProblemRenderer } from '../../src/problem-types/ProblemRenderer'
import { ArticleStep } from '../../src/problem-types/article/ArticleStep'
import { BlockProblemStep } from '../../src/problem-types/block_problem/BlockProblemStep'
import { PythonSandboxStep } from '../../src/problem-types/python_sandbox/PythonSandboxStep'
import type { Step } from '../../src/content/schemas'

const articleStep = {
  id: 'a',
  type: 'article',
  graded: false,
  points: 100,
  config: { panels: [{ text: 'hi' }] },
} as Step

const blockStep = {
  id: 'b',
  type: 'block_problem',
  graded: true,
  points: 100,
  config: { mode: 'sandbox', prompt: 'p', palette: [], initial: [] },
} as Step

const pythonStep = {
  id: 'c',
  type: 'python_sandbox',
  graded: false,
  points: 100,
  config: { prompt: 'p', starterCode: '', testCases: [] },
} as Step

// [Phase 2] Problem-type registry mapping
describe('[Phase 2] registry', () => {
  it('maps each known type to its component', () => {
    expect(getRenderer('article')?.component).toBe(ArticleStep)
    expect(getRenderer('block_problem')?.component).toBe(BlockProblemStep)
    expect(getRenderer('python_sandbox')?.component).toBe(PythonSandboxStep)
  })

  it('returns null for an unknown type', () => {
    expect(getRenderer('mystery')).toBeNull()
  })

  it('pairs each component with a config schema', () => {
    for (const entry of Object.values(problemRegistry)) {
      expect(entry.configSchema).toBeDefined()
    }
  })
})

// [Phase 2] ProblemRenderer dispatch + safe fallback
describe('[Phase 2] ProblemRenderer', () => {
  it('renders the article renderer for an article step', () => {
    render(<ProblemRenderer step={articleStep} />)
    expect(screen.getByText('hi')).toBeInTheDocument()
    expect(document.querySelector('[data-step-type="article"]')).not.toBeNull()
  })

  it('renders the block renderer for a block step', () => {
    render(<ProblemRenderer step={blockStep} />)
    expect(document.querySelector('[data-step-type="block_problem"]')).not.toBeNull()
  })

  it('renders the python renderer for a python step', () => {
    render(<ProblemRenderer step={pythonStep} />)
    expect(document.querySelector('[data-step-type="python_sandbox"]')).not.toBeNull()
  })

  it('renders a safe fallback for an unknown type', () => {
    const bogus = { id: 'x', type: 'mystery', graded: false, points: 100, config: {} } as unknown as Step
    render(<ProblemRenderer step={bogus} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/unsupported/i)
  })
})
