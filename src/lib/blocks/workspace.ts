import { getBlockDef, type CodeNode } from './definitions'

// A placed block in the workspace. Structurally a CodeNode plus a stable id,
// so it can be fed directly to the compiler.
export interface WorkspaceBlock extends CodeNode {
  id: string
  fields: Record<string, string | number>
  slots: Record<string, WorkspaceBlock[]>
}

export interface WorkspaceState {
  program: WorkspaceBlock[]
  // The block type the user has "picked up" (tap-to-place step 1), if any.
  held: string | null
  // When true, blocks cannot be removed — the learner may only edit their
  // contents (used by fill-in-the-blank steps with `lockBlocks`).
  locked: boolean
}

// A drop location: append into a slot. Root program uses parentId === null.
export interface DropTarget {
  parentId: string | null
  slot: string
}

export type WorkspaceAction =
  | { kind: 'hold'; blockType: string | null }
  | { kind: 'place'; target: DropTarget }
  | { kind: 'set-field'; id: string; field: string; value: string | number }
  | { kind: 'remove'; id: string }
  | { kind: 'reset'; program?: WorkspaceBlock[] }

let idCounter = 0
export function makeBlock(type: string, idSeed?: string): WorkspaceBlock {
  const def = getBlockDef(type)
  const fields: Record<string, string | number> = {}
  def?.fields.forEach((f) => {
    fields[f.name] = f.default
  })
  const slots: Record<string, WorkspaceBlock[]> = {}
  def?.slots.forEach((s) => {
    // Auto-fill value slots (e.g. loop variable, range bounds) so they are
    // editable inline; nesting slots start empty and act as drop targets.
    slots[s.name] = s.defaultChild ? hydrate([s.defaultChild]) : []
  })
  const id = idSeed ?? `b${++idCounter}`
  return { id, type, fields, slots }
}

/** Materialize seed CodeNodes (e.g. from content `initial`) into WorkspaceBlocks. */
export function hydrate(nodes: CodeNode[] = []): WorkspaceBlock[] {
  return nodes.map((n) => {
    const block = makeBlock(n.type)
    if (n.fields) block.fields = { ...block.fields, ...n.fields }
    if (n.slots) {
      for (const [slot, children] of Object.entries(n.slots)) {
        block.slots[slot] = hydrate(children)
      }
    }
    return block
  })
}

function mapTree(
  blocks: WorkspaceBlock[],
  fn: (b: WorkspaceBlock) => WorkspaceBlock,
): WorkspaceBlock[] {
  return blocks.map((b) => {
    const mapped = fn(b)
    const slots: Record<string, WorkspaceBlock[]> = {}
    for (const [name, children] of Object.entries(mapped.slots)) {
      slots[name] = mapTree(children, fn)
    }
    return { ...mapped, slots }
  })
}

function insertInto(
  blocks: WorkspaceBlock[],
  target: DropTarget,
  newBlock: WorkspaceBlock,
): WorkspaceBlock[] {
  // The root program is a statement list: append.
  if (target.parentId === null) {
    return [...blocks, newBlock]
  }
  return blocks.map((b) => {
    if (b.id === target.parentId) {
      const slotDef = getBlockDef(b.type)?.slots.find((s) => s.name === target.slot)
      const existing = b.slots[target.slot] ?? []
      // Expression slots hold exactly one child (replace); statement slots append.
      const next = slotDef?.kind === 'expression' ? [newBlock] : [...existing, newBlock]
      return { ...b, slots: { ...b.slots, [target.slot]: next } }
    }
    return { ...b, slots: mapSlots(b.slots, (children) => insertInto(children, target, newBlock)) }
  })
}

function mapSlots(
  slots: Record<string, WorkspaceBlock[]>,
  fn: (children: WorkspaceBlock[]) => WorkspaceBlock[],
): Record<string, WorkspaceBlock[]> {
  const out: Record<string, WorkspaceBlock[]> = {}
  for (const [name, children] of Object.entries(slots)) {
    out[name] = fn(children)
  }
  return out
}

function removeById(blocks: WorkspaceBlock[], id: string): WorkspaceBlock[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => ({ ...b, slots: mapSlots(b.slots, (children) => removeById(children, id)) }))
}

export function findBlock(blocks: WorkspaceBlock[], id: string): WorkspaceBlock | null {
  for (const b of blocks) {
    if (b.id === id) return b
    for (const children of Object.values(b.slots)) {
      const found = findBlock(children, id)
      if (found) return found
    }
  }
  return null
}

export function initialWorkspace(initial: CodeNode[] = [], locked = false): WorkspaceState {
  return { program: hydrate(initial), held: null, locked }
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.kind) {
    case 'hold':
      return { ...state, held: action.blockType }
    case 'place': {
      if (!state.held) return state
      const block = makeBlock(state.held)
      return { ...state, program: insertInto(state.program, action.target, block), held: null }
    }
    case 'set-field':
      return {
        ...state,
        program: mapTree(state.program, (b) =>
          b.id === action.id
            ? { ...b, fields: { ...b.fields, [action.field]: action.value } }
            : b,
        ),
      }
    case 'remove':
      // While locked, blocks may only be edited, never removed.
      if (state.locked) return state
      return { ...state, program: removeById(state.program, action.id) }
    case 'reset':
      return { ...state, program: action.program ?? [], held: null }
    default:
      return state
  }
}
