import { describe, it, expect } from 'vitest'
import {
  findBlock,
  initialWorkspace,
  workspaceReducer,
  type WorkspaceState,
} from '../../src/lib/blocks/workspace'

// [Phase 4] tap-to-place workspace reducer (statement + expression slots)
describe('[Phase 4] workspace reducer (tap-to-place)', () => {
  it('places a held statement block into the root program', () => {
    let state: WorkspaceState = initialWorkspace()
    state = workspaceReducer(state, { kind: 'hold', blockType: 'print' })
    expect(state.held).toBe('print')
    state = workspaceReducer(state, { kind: 'place', target: { parentId: null, slot: 'program' } })
    expect(state.program).toHaveLength(1)
    expect(state.program[0].type).toBe('print')
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

  it('appends statements into a statement slot (loop body)', () => {
    let state: WorkspaceState = initialWorkspace()
    state = workspaceReducer(state, { kind: 'hold', blockType: 'for_each' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: null, slot: 'program' } })
    const forId = state.program[0].id

    state = workspaceReducer(state, { kind: 'hold', blockType: 'print' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: forId, slot: 'body' } })
    state = workspaceReducer(state, { kind: 'hold', blockType: 'print' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: forId, slot: 'body' } })

    expect(findBlock(state.program, forId)?.slots.body).toHaveLength(2)
  })

  it('replaces (does not append) into an expression slot', () => {
    let state: WorkspaceState = initialWorkspace()
    state = workspaceReducer(state, { kind: 'hold', blockType: 'print' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: null, slot: 'program' } })
    const printId = state.program[0].id

    state = workspaceReducer(state, { kind: 'hold', blockType: 'str' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: printId, slot: 'value' } })
    state = workspaceReducer(state, { kind: 'hold', blockType: 'num' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: printId, slot: 'value' } })

    const value = findBlock(state.program, printId)?.slots.value
    expect(value).toHaveLength(1)
    expect(value?.[0].type).toBe('num')
  })

  it('updates a value field and removes a nested block', () => {
    let state: WorkspaceState = initialWorkspace()
    state = workspaceReducer(state, { kind: 'hold', blockType: 'num' })
    state = workspaceReducer(state, { kind: 'place', target: { parentId: null, slot: 'program' } })
    const numId = state.program[0].id

    state = workspaceReducer(state, { kind: 'set-field', id: numId, field: 'value', value: 9 })
    expect(state.program[0].fields.value).toBe(9)

    state = workspaceReducer(state, { kind: 'remove', id: numId })
    expect(state.program).toHaveLength(0)
  })

  it('rejects remove when the workspace is locked (lockBlocks)', () => {
    let state: WorkspaceState = initialWorkspace(
      [{ type: 'print', slots: { value: [{ type: 'str', fields: { value: 'Hi' } }] } }],
      true,
    )
    expect(state.locked).toBe(true)
    const printId = state.program[0].id
    state = workspaceReducer(state, { kind: 'remove', id: printId })
    // The block is still there — removal is disabled while locked.
    expect(state.program).toHaveLength(1)
    expect(findBlock(state.program, printId)).not.toBeNull()
  })

  it('still allows editing fields while locked', () => {
    let state: WorkspaceState = initialWorkspace(
      [{ type: 'assign', slots: { target: [{ type: 'var', fields: { name: 'word' } }], value: [{ type: 'str', fields: { value: 'Hi' } }] } }],
      true,
    )
    const assignId = state.program[0].id
    const strId = findBlock(state.program, assignId)!.slots.value[0].id
    state = workspaceReducer(state, { kind: 'set-field', id: strId, field: 'value', value: 'Hello' })
    expect(findBlock(state.program, strId)?.fields.value).toBe('Hello')
  })

  it('defaults to unlocked (remove works) when no lock flag is passed', () => {
    const state = initialWorkspace([{ type: 'print' }])
    expect(state.locked).toBe(false)
  })

  it('hydrates nested initial content and resets', () => {
    const state = initialWorkspace([
      {
        type: 'for_each',
        slots: {
          var: [{ type: 'var', fields: { name: 'i' } }],
          iter: [
            {
              type: 'range_call',
              slots: { start: [{ type: 'num', fields: { value: 0 } }], stop: [{ type: 'num', fields: { value: 5 } }] },
            },
          ],
          body: [],
        },
      },
    ])
    const forBlock = state.program[0]
    expect(forBlock.slots.iter[0].type).toBe('range_call')
    expect(forBlock.slots.iter[0].slots.stop[0].fields.value).toBe(5)

    const reset = workspaceReducer(state, { kind: 'reset', program: [] })
    expect(reset.program).toHaveLength(0)
  })
})
