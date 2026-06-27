import { describe, it, expect } from 'vitest'
import { selectDailyConcepts } from '../../src/lib/daily/schedule'
import { emptyConcept, type ConceptMastery } from '../../src/lib/daily/types'
import { MASTERY_CONCEPTS, type MasteryConcept } from '../../src/content/mastery'

// [Phase 12] Concept selection: the day's set is the most-due / weakest concepts,
// with just-reviewed ones pushed to the back.

const today = '2026-06-27'

describe('[Phase 12] selectDailyConcepts', () => {
  it('treats every concept as due when the store is empty (all brand-new)', () => {
    const picked = selectDailyConcepts({}, [...MASTERY_CONCEPTS], today, 5)
    expect(picked).toHaveLength(5)
  })

  it('orders most-due/weakest first and a just-reviewed concept last', () => {
    const all: MasteryConcept[] = ['print', 'loop', 'function']
    const store: Record<string, ConceptMastery | undefined> = {
      // Just reviewed today and strong -> priority ~0.
      print: { ...emptyConcept(today), strength: 0.95, intervalDays: 7, lastSeenAt: today },
      // Very overdue and weak -> highest priority.
      loop: { ...emptyConcept('2026-05-01'), strength: 0.15, intervalDays: 7, lastSeenAt: '2026-05-01' },
      // `function` is unseen (undefined) -> the brand-new constant.
    }
    const order = selectDailyConcepts(store, all, today, 3)
    expect(order[0]).toBe('loop')
    expect(order[order.length - 1]).toBe('print')
  })

  it('deprioritizes a just-reviewed concept below an unseen one', () => {
    const all: MasteryConcept[] = ['print', 'loop']
    const store: Record<string, ConceptMastery | undefined> = {
      print: { ...emptyConcept(today), strength: 0.95, intervalDays: 7, lastSeenAt: today },
      // `loop` is unseen.
    }
    expect(selectDailyConcepts(store, all, today, 1)).toEqual(['loop'])
  })
})
