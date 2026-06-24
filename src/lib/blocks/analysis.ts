import { LOOP_TYPES, type CodeNode } from './definitions'

/** True if the block program contains a loop anywhere in its tree. */
export function usesLoopNode(nodes: CodeNode[]): boolean {
  for (const node of nodes) {
    if (LOOP_TYPES.has(node.type)) return true
    for (const children of Object.values(node.slots ?? {})) {
      if (usesLoopNode(children)) return true
    }
  }
  return false
}
