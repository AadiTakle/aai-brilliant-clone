import { describe, it, expect } from 'vitest'
import { validateAllLessons, validateLessonData } from '../../src/content/validate'

// [Phase 2] validate-content logic
describe('[Phase 2] content validation', () => {
  it('validates the entire catalog successfully', () => {
    const report = validateAllLessons()
    expect(report.ok).toBe(true)
    expect(report.results.length).toBeGreaterThan(0)
  })

  it('throws on a lesson with an unknown step type', () => {
    const bad = {
      id: 'bad',
      title: 'Bad',
      version: 1,
      steps: [{ id: 's', type: 'mystery', config: {} }],
    }
    expect(() => validateLessonData(bad)).toThrow()
  })

  it('throws on a step with an invalid config', () => {
    const bad = {
      id: 'bad',
      title: 'Bad',
      version: 1,
      steps: [{ id: 's', type: 'article', config: { panels: [] } }],
    }
    expect(() => validateLessonData(bad)).toThrow()
  })
})
