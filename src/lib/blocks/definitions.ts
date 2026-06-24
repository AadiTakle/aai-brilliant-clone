// Block engine: Scratch-style blocks whose labels ARE Python. There are two
// categories:
//   - statement blocks (compile to one or more lines via `toCode`), e.g. the
//     for-loop and print.
//   - value blocks (compile to a single expression via `toExpr`), e.g. range(),
//     a number, a string, or a variable name.
//
// Slots are either `statement` (an ordered list of child statements, like a
// loop body) or `expression` (exactly one child value block, like the argument
// of print or range). Expression slots that are still empty compile to a
// sentinel so unfinished programs grade as incorrect.

export const EMPTY_SLOT = '__?__'

export interface BlockField {
  name: string
  kind: 'text' | 'number'
  label?: string
  default: string | number
}

export type SlotKind = 'statement' | 'expression'

export interface BlockSlot {
  name: string
  kind: SlotKind
  label?: string
}

export interface CodeNode {
  type: string
  fields?: Record<string, string | number>
  slots?: Record<string, CodeNode[]>
}

export interface CompileCtx {
  /** Compile a statement slot into indented-ready lines. */
  statements: (slot: string) => string[]
  /** Compile an expression slot into a single Python expression. */
  expr: (slot: string) => string
}

export interface BlockDef {
  type: string
  category: 'statement' | 'value'
  /** Palette label. For blocks with expression slots, `⬡` marks each slot in order. */
  label: string
  fields: BlockField[]
  slots: BlockSlot[]
  toCode?: (node: CodeNode, ctx: CompileCtx) => string[]
  toExpr?: (node: CodeNode, ctx: CompileCtx) => string
}

function field(node: CodeNode, name: string, fallback: string | number): string | number {
  const v = node.fields?.[name]
  return v === undefined || v === '' ? fallback : v
}

/** Render a Python string literal from arbitrary text (double-quoted, escaped). */
export function pyString(text: string): string {
  return JSON.stringify(String(text))
}

/** Block types that introduce a loop (used by the "must use a loop" check). */
export const LOOP_TYPES = new Set<string>(['for_each'])

export const BLOCK_DEFS: Record<string, BlockDef> = {
  for_each: {
    type: 'for_each',
    category: 'statement',
    label: 'for ⬡ in ⬡:',
    fields: [],
    slots: [
      { name: 'var', kind: 'expression', label: 'variable' },
      { name: 'iter', kind: 'expression', label: 'sequence' },
      { name: 'body', kind: 'statement', label: 'repeat' },
    ],
    toCode: (_node, ctx) => {
      const v = ctx.expr('var')
      const seq = ctx.expr('iter')
      const body = ctx.statements('body')
      const indented = body.length > 0 ? body.map((l) => `    ${l}`) : ['    pass']
      return [`for ${v} in ${seq}:`, ...indented]
    },
  },
  print: {
    type: 'print',
    category: 'statement',
    label: 'print(⬡)',
    fields: [],
    slots: [{ name: 'value', kind: 'expression', label: 'value' }],
    toCode: (_node, ctx) => [`print(${ctx.expr('value')})`],
  },
  range_call: {
    type: 'range_call',
    category: 'value',
    label: 'range(⬡, ⬡)',
    fields: [],
    slots: [
      { name: 'start', kind: 'expression', label: 'start' },
      { name: 'stop', kind: 'expression', label: 'stop' },
    ],
    toExpr: (_node, ctx) => `range(${ctx.expr('start')}, ${ctx.expr('stop')})`,
  },
  num: {
    type: 'num',
    category: 'value',
    label: 'number',
    fields: [{ name: 'value', kind: 'number', label: 'number', default: 0 }],
    slots: [],
    toExpr: (node) => String(field(node, 'value', 0)),
  },
  str: {
    type: 'str',
    category: 'value',
    label: 'text',
    fields: [{ name: 'value', kind: 'text', label: 'text', default: 'Hello!' }],
    slots: [],
    toExpr: (node) => pyString(String(field(node, 'value', 'Hello!'))),
  },
  var: {
    type: 'var',
    category: 'value',
    label: 'variable',
    fields: [{ name: 'name', kind: 'text', label: 'name', default: 'i' }],
    slots: [],
    toExpr: (node) => String(field(node, 'name', 'i')),
  },
}

export function getBlockDef(type: string): BlockDef | undefined {
  return BLOCK_DEFS[type]
}

export function blockCategory(type: string): 'statement' | 'value' | undefined {
  return BLOCK_DEFS[type]?.category
}
