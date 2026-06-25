import { CONDITIONAL_TYPES, LOOP_TYPES, type CodeNode } from './definitions'

/** Walk the block tree, returning true as soon as `match` accepts a node. */
function anyNode(nodes: CodeNode[], match: (node: CodeNode) => boolean): boolean {
  for (const node of nodes) {
    if (match(node)) return true
    for (const children of Object.values(node.slots ?? {})) {
      if (anyNode(children, match)) return true
    }
  }
  return false
}

/** True if the block program contains a loop anywhere in its tree. */
export function usesLoopNode(nodes: CodeNode[]): boolean {
  return anyNode(nodes, (node) => LOOP_TYPES.has(node.type))
}

/** True if the block program contains an `if` anywhere in its tree. */
export function usesConditionalNode(nodes: CodeNode[]): boolean {
  return anyNode(nodes, (node) => CONDITIONAL_TYPES.has(node.type))
}

/** True if the block program uses the modulo (`%`) operator anywhere. */
export function usesModuloNode(nodes: CodeNode[]): boolean {
  return anyNode(nodes, (node) => node.type === 'binop' && node.fields?.op === '%')
}

export type Construct = 'loop' | 'modulo' | 'conditional'

const NODE_DETECTORS: Record<Construct, (nodes: CodeNode[]) => boolean> = {
  loop: usesLoopNode,
  conditional: usesConditionalNode,
  modulo: usesModuloNode,
}

/** Which required constructs are missing from a block program. */
export function missingConstructsNode(nodes: CodeNode[], required: Construct[]): Construct[] {
  return required.filter((c) => !NODE_DETECTORS[c](nodes))
}

/**
 * True when some `print` block prints the variable `varName` directly (its
 * argument is that `var` leaf). Answer-free: it inspects only the block shape,
 * never the value, so it can guard against "skipping the box" (typing a literal
 * straight into print()) without revealing the expected output.
 */
export function printsVariable(nodes: CodeNode[], varName: string): boolean {
  return anyNode(nodes, (node) => {
    if (node.type !== 'print') return false
    const arg = node.slots?.value?.[0]
    return arg?.type === 'var' && arg.fields?.name === varName
  })
}

/**
 * True when some `compare` block actually tests the variable `varName` (it sits
 * on one side of the comparison). Optionally also require a specific operator
 * (`op`, e.g. "==") and/or a specific number literal on the OTHER side
 * (`against`, e.g. 0). Answer-free: it inspects only the block shape, so it can
 * insist the learner's yes/no question really checks the box they built — and
 * not a hardcoded `0 == 0` or an unrelated `i == 9` — without revealing values
 * the prompt has not already given.
 */
export function comparesVariable(
  nodes: CodeNode[],
  varName: string,
  op?: string,
  against?: number,
): boolean {
  return anyNode(nodes, (node) => {
    if (node.type !== 'compare') return false
    if (op !== undefined && node.fields?.op !== op) return false
    const sides = [node.slots?.left?.[0], node.slots?.right?.[0]]
    const hasVar = sides.some((s) => s?.type === 'var' && s?.fields?.name === varName)
    if (!hasVar) return false
    if (against !== undefined) {
      const hasVal = sides.some((s) => s?.type === 'num' && Number(s?.fields?.value) === against)
      if (!hasVal) return false
    }
    return true
  })
}

/** A stable string repr of a value leaf (number / text / variable / other). */
function valueLeafRepr(node: CodeNode | undefined): string {
  if (!node) return ''
  const f = node.fields ?? {}
  if (node.type === 'str') return `"${f.value ?? ''}"`
  if (node.type === 'num') return `#${f.value ?? ''}`
  if (node.type === 'var') return `@${f.name ?? ''}`
  return node.type
}

/** The ordered values assigned to `varName` by top-level `assign` blocks. */
function assignedValues(nodes: CodeNode[], varName: string): string[] {
  return nodes
    .filter((n) => n.type === 'assign' && n.slots?.target?.[0]?.fields?.name === varName)
    .map((n) => valueLeafRepr(n.slots?.value?.[0]))
}

/**
 * True when the learner edited an EARLIER assignment to `varName` but left the
 * LAST assignment unchanged from the initial program. This is the classic
 * "last value wins" mistake: they changed the wrong line. Returns false unless
 * there are at least two assignments and the assignment count is unchanged
 * (so we are comparing like-for-like). Used to surface a unique, answer-free
 * hint — it never reveals the target value.
 */
export function reassignmentEditedEarlierNotLast(
  current: CodeNode[],
  initial: CodeNode[],
  varName: string,
): boolean {
  const cur = assignedValues(current, varName)
  const init = assignedValues(initial, varName)
  if (cur.length < 2 || cur.length !== init.length) return false
  const last = cur.length - 1
  const lastUnchanged = cur[last] === init[last]
  const earlierChanged = cur.slice(0, last).some((v, i) => v !== init[i])
  return lastUnchanged && earlierChanged
}
