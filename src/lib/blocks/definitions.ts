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
  kind: 'text' | 'number' | 'select'
  label?: string
  default: string | number
  /** Allowed values for `kind: 'select'` (rendered as an inline dropdown). */
  options?: string[]
}

export type SlotKind = 'statement' | 'expression'

export interface BlockSlot {
  name: string
  kind: SlotKind
  label?: string
  /**
   * For expression slots: a value block to auto-insert when the parent is
   * created, so simple values (a loop variable, range bounds, a printed string)
   * are editable inline rather than dragged. Slots without a default stay empty
   * and act as drop targets for nesting functions/statements.
   */
  defaultChild?: CodeNode
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

const BODY_INDENT = '    '

/**
 * Attach an indented body to a header line. Each child line is indented by 4
 * spaces; because every nesting block does this to its own body, deeper nesting
 * (for -> if -> print) composes to the correct cumulative indentation. An empty
 * body becomes `pass` so the program still parses.
 */
function withBody(header: string, body: string[]): string[] {
  const indented = body.length > 0 ? body.map((l) => BODY_INDENT + l) : [BODY_INDENT + 'pass']
  return [header, ...indented]
}

/** Block types that introduce a loop (used by the "must use a loop" check). */
export const LOOP_TYPES = new Set<string>(['for_each'])

/** Block types that introduce a conditional (used by the "must use an if" check). */
export const CONDITIONAL_TYPES = new Set<string>(['if_block'])

export const BLOCK_DEFS: Record<string, BlockDef> = {
  for_each: {
    type: 'for_each',
    category: 'statement',
    label: 'for ⬡ in ⬡:',
    fields: [],
    slots: [
      // The loop variable auto-fills with `i` (edit inline, not drag).
      { name: 'var', kind: 'expression', label: 'variable', defaultChild: { type: 'var', fields: { name: 'i' } } },
      // The sequence is the only nesting slot: drop a range()/other here.
      { name: 'iter', kind: 'expression', label: 'sequence' },
      { name: 'body', kind: 'statement', label: 'repeat' },
    ],
    toCode: (_node, ctx) => withBody(`for ${ctx.expr('var')} in ${ctx.expr('iter')}:`, ctx.statements('body')),
  },
  print: {
    type: 'print',
    category: 'statement',
    label: 'print(⬡)',
    fields: [],
    slots: [
      {
        name: 'value',
        kind: 'expression',
        label: 'value',
        defaultChild: { type: 'str', fields: { value: 'Hello!' } },
      },
    ],
    toCode: (_node, ctx) => [`print(${ctx.expr('value')})`],
  },
  range_call: {
    type: 'range_call',
    category: 'value',
    label: 'range(⬡, ⬡)',
    fields: [],
    slots: [
      { name: 'start', kind: 'expression', label: 'start', defaultChild: { type: 'num', fields: { value: 0 } } },
      { name: 'stop', kind: 'expression', label: 'stop', defaultChild: { type: 'num', fields: { value: 5 } } },
    ],
    toExpr: (_node, ctx) => `range(${ctx.expr('start')}, ${ctx.expr('stop')})`,
  },
  range_n: {
    type: 'range_n',
    category: 'value',
    label: 'range(⬡)',
    fields: [],
    slots: [{ name: 'stop', kind: 'expression', label: 'count', defaultChild: { type: 'num', fields: { value: 5 } } }],
    toExpr: (_node, ctx) => `range(${ctx.expr('stop')})`,
  },
  assign: {
    type: 'assign',
    category: 'statement',
    label: '⬡ = ⬡',
    fields: [],
    slots: [
      // The name being set auto-fills with `x` (edit inline).
      { name: 'target', kind: 'expression', label: 'name', defaultChild: { type: 'var', fields: { name: 'x' } } },
      // The value can be a literal (auto-filled) or a dropped expression.
      { name: 'value', kind: 'expression', label: 'value', defaultChild: { type: 'num', fields: { value: 0 } } },
    ],
    toCode: (_node, ctx) => [`${ctx.expr('target')} = ${ctx.expr('value')}`],
  },
  if_block: {
    type: 'if_block',
    category: 'statement',
    label: 'if ⬡:',
    fields: [],
    slots: [
      // The condition is the nesting slot: drop a comparison here.
      { name: 'cond', kind: 'expression', label: 'condition' },
      { name: 'body', kind: 'statement', label: 'then' },
    ],
    toCode: (_node, ctx) => withBody(`if ${ctx.expr('cond')}:`, ctx.statements('body')),
  },
  elif_block: {
    type: 'elif_block',
    category: 'statement',
    label: 'elif ⬡:',
    fields: [],
    slots: [
      { name: 'cond', kind: 'expression', label: 'condition' },
      { name: 'body', kind: 'statement', label: 'then' },
    ],
    toCode: (_node, ctx) => withBody(`elif ${ctx.expr('cond')}:`, ctx.statements('body')),
  },
  else_block: {
    type: 'else_block',
    category: 'statement',
    label: 'else:',
    fields: [],
    slots: [{ name: 'body', kind: 'statement', label: 'otherwise' }],
    toCode: (_node, ctx) => withBody('else:', ctx.statements('body')),
  },
  compare: {
    type: 'compare',
    category: 'value',
    // `◇` marks the inline operator dropdown; `⬡` marks each expression slot.
    label: '⬡ ◇ ⬡',
    // Only the comparison signs the curriculum actually teaches (==, >, <).
    // The extra comparators (!=, <=, >=) are never taught, so leaving them in
    // the dropdown would just confuse a true beginner.
    fields: [{ name: 'op', kind: 'select', label: 'operator', default: '==', options: ['==', '>', '<'] }],
    slots: [
      { name: 'left', kind: 'expression', label: 'left', defaultChild: { type: 'var', fields: { name: 'i' } } },
      { name: 'right', kind: 'expression', label: 'right', defaultChild: { type: 'num', fields: { value: 0 } } },
    ],
    toExpr: (node, ctx) => `${ctx.expr('left')} ${field(node, 'op', '==')} ${ctx.expr('right')}`,
  },
  binop: {
    type: 'binop',
    category: 'value',
    label: '⬡ ◇ ⬡',
    fields: [{ name: 'op', kind: 'select', label: 'operator', default: '%', options: ['%', '+', '-', '*', '//'] }],
    slots: [
      { name: 'left', kind: 'expression', label: 'left', defaultChild: { type: 'var', fields: { name: 'i' } } },
      { name: 'right', kind: 'expression', label: 'right', defaultChild: { type: 'num', fields: { value: 3 } } },
    ],
    toExpr: (node, ctx) => `${ctx.expr('left')} ${field(node, 'op', '%')} ${ctx.expr('right')}`,
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
    // Unlike numbers/names, an empty string "" is a valid, meaningful value
    // (e.g. label = ""), so only fall back when the field is truly absent.
    toExpr: (node) => pyString(node.fields?.value === undefined ? 'Hello!' : String(node.fields.value)),
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
