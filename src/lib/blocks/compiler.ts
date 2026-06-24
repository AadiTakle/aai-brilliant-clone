import { BLOCK_DEFS, EMPTY_SLOT, type BlockDef, type CodeNode, type CompileCtx } from './definitions'

/**
 * Pure compiler: turns a block graph into Python source. Statement slots are
 * compiled recursively into lines (the parent indents its own body); expression
 * slots compile to a single expression string, or a sentinel when still empty.
 */
function makeCtx(node: CodeNode, defs: Record<string, BlockDef>): CompileCtx {
  return {
    statements: (slot) => compileBlocks(node.slots?.[slot] ?? [], defs),
    expr: (slot) => {
      const child = node.slots?.[slot]?.[0]
      return child ? compileExpr(child, defs) : EMPTY_SLOT
    },
  }
}

function compileExpr(node: CodeNode, defs: Record<string, BlockDef>): string {
  const def = defs[node.type]
  if (!def || !def.toExpr) return EMPTY_SLOT
  return def.toExpr(node, makeCtx(node, defs))
}

export function compileBlocks(
  nodes: CodeNode[],
  defs: Record<string, BlockDef> = BLOCK_DEFS,
): string[] {
  const lines: string[] = []
  for (const node of nodes) {
    const def = defs[node.type]
    if (!def || !def.toCode) {
      lines.push(`# unknown block: ${node.type}`)
      continue
    }
    lines.push(...def.toCode(node, makeCtx(node, defs)))
  }
  return lines
}

export function compileToSource(
  nodes: CodeNode[],
  defs: Record<string, BlockDef> = BLOCK_DEFS,
): string {
  return compileBlocks(nodes, defs).join('\n')
}
