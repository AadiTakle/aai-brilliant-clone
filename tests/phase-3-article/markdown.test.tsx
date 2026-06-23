import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArticleStep } from '../../src/problem-types/article/ArticleStep'
import type { Step } from '../../src/content/schemas'

const step = {
  id: 'a',
  type: 'article',
  title: 'Intro',
  graded: false,
  points: 100,
  config: {
    panels: [{ text: 'Loops repeat **work** for you.' }],
  },
} as Step

// [Phase 3] Article markdown rendering
describe('[Phase 3] article markdown', () => {
  it('renders markdown content (incl. emphasis)', () => {
    render(<ArticleStep step={step} />)
    expect(screen.getByText('Intro')).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
    expect(screen.getByText('work').tagName.toLowerCase()).toBe('strong')
  })
})
