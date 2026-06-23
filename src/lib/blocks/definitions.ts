// Block engine: a small set of "atomic blocks + typed slots" sufficient to
// teach loops. Each definition knows its palette label, its editable fields,
// its slots (containers for child blocks), and how to compile to Python.

export interface BlockField {
  name: string
  kind: 'text' | 'number'
  label?: string
  default: string | number
}

export interface BlockSlot {
  name: string
  label?: string
}

export interface CodeNode {
  type: string
  fields?: Record<string, string | number>
  slots?: Record<string, CodeNode[]>
}

export interface BlockDef {
  type: string
  label: string
  fields: BlockField[]
  slots: BlockSlot[]
  toCode: (node: CodeNode, renderSlot: (slot: string) => string[]) => string[]
}

function field(node: CodeNode, name: string, fallback: string | number): string | number {
  const v = node.fields?.[name]
  return v === undefined || v === '' ? fallback : v
}

/** Render a Python string literal from arbitrary text (double-quoted, escaped). */
export function pyString(text: string): string {
  return JSON.stringify(String(text))
}

export const BLOCK_DEFS: Record<string, BlockDef> = {
  for_range: {
    type: 'for_range',
    label: 'for i in range(n):',
    fields: [
      { name: 'var', kind: 'text', label: 'variable', default: 'i' },
      { name: 'count', kind: 'number', label: 'times', default: 3 },
    ],
    slots: [{ name: 'body', label: 'repeat' }],
    toCode: (node, renderSlot) => {
      const v = String(field(node, 'var', 'i'))
      const n = field(node, 'count', 3)
      const body = renderSlot('body')
      const indented = body.length > 0 ? body.map((l) => `    ${l}`) : ['    pass']
      return [`for ${v} in range(${n}):`, ...indented]
    },
  },
  print_text: {
    type: 'print_text',
    label: 'print("text")',
    fields: [{ name: 'text', kind: 'text', label: 'text', default: 'Hello!' }],
    slots: [],
    toCode: (node) => [`print(${pyString(String(field(node, 'text', 'Hello!')))})`],
  },
  print_var: {
    type: 'print_var',
    label: 'print(i)',
    fields: [{ name: 'var', kind: 'text', label: 'variable', default: 'i' }],
    slots: [],
    toCode: (node) => [`print(${field(node, 'var', 'i')})`],
  },
}

export function getBlockDef(type: string): BlockDef | undefined {
  return BLOCK_DEFS[type]
}
