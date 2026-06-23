import { describe, it, expect } from 'vitest'
import {
  findBlock,
  initialWorkspace,
  workspaceReducer,
  type WorkspaceState,
} from '../../src/lib/blocks/workspace'

// [Phase 4] tap-to-place workspace reducer
describe('[Phase 4] workspace reducer (tap-to-place)', () => {
  it('places a held block into the root program', () => {
    let state: WorkspaceState = initialWorkspace()
    state = workspaceReducer(state, { kind: 'hold', blockType: 'print_text' })
    expect(state.held).toBe('print_text')
    state = workspaceReducer(state, { kind: 'place', target: { parentId: null, slot: 'program' } })
    expect(state.program).toHaveLength(1)
    expect(state.program[0].type).toBe('print_text')
    expect(state.held).toBeNull()
  })

  it('is a no-op to place when nothing is held', () => {
    const state = initialWorkspace()
    const next = workspaceReducer(state, {
      kind: 'place',
      target: { parentId: null, slot: 'program' },
    })
    expect(next.program).toHaveLength(0)
  })

  it('places a block into a nested slot (loop body)', () => {
    let state: WorkspaceState = initialWorkspace()
    state = workspaceReducer(state, { kind: 'hold', blockType: 'for_range' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: null, slot: 'program' } })
    const forId = state.program[0].id

    state = workspaceReducer(state, { kind: 'hold', blockType: 'print_var' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: forId, slot: 'body' } })

    const forBlock = findBlock(state.program, forId)
    expect(forBlock?.slots.body).toHaveLength(1)
    expect(forBlock?.slots.body[0].type).toBe('print_var')
  })

  it('updates a field and removes a nested block', () => {
    let state: WorkspaceState = initialWorkspace()
    state = workspaceReducer(state, { kind: 'hold', blockType: 'for_range' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: null, slot: 'program' } })
    const forId = state.program[0].id

    state = workspaceReducer(state, { kind: 'set-field', id: forId, field: 'count', value: 9 })
    expect(state.program[0].fields.count).toBe(9)

    state = workspaceReducer(state, { kind: 'hold', blockType: 'print_var' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: forId, slot: 'body' } })
    const childId = findBlock(state.program, forId)!.slots.body[0].id

    state = workspaceReducer(state, { kind: 'remove', id: childId })
    expect(findBlock(state.program, forId)?.slots.body).toHaveLength(0)
  })

  it('hydrates initial content and resets', () => {
    const state = initialWorkspace([
      { type: 'for_range', fields: { count: 5 }, slots: { body: [] } },
    ])
    expect(state.program[0].fields.count).toBe(5)
    const reset = workspaceReducer(state, { kind: 'reset', program: [] })
    expect(reset.program).toHaveLength(0)
  })
})
