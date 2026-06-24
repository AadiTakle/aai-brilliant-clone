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
