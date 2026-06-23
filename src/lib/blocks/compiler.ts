import { BLOCK_DEFS, type BlockDef, type CodeNode } from './definitions'

/**
 * Pure compiler: turns a block graph into Python source. Slots are compiled
 * recursively; each block definition is responsible for indenting its own
 * slot bodies.
 */
export function compileBlocks(
  nodes: CodeNode[],
  defs: Record<string, BlockDef> = BLOCK_DEFS,
): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    const def = defs[node.type]
    if (!def) {
      lines.push(`# unknown block: ${node.type}`)
      continue
    }
    const renderSlot = (slot: string) => compileBlocks(node.slots?.[slot] ?? [], defs)
    lines.push(...def.toCode(node, renderSlot))
  }
  return lines
}

export function compileToSource(
  nodes: CodeNode[],
  defs: Record<string, BlockDef> = BLOCK_DEFS,
): string {
  return compileBlocks(nodes, defs).join('\n')
}
