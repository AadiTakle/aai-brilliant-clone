// Detects whether Python source actually uses a loop. Strings and comments are
// removed first so a `for`/`while` appearing inside a string literal (e.g.
// print("for")) does not count as a loop.

export function stripStringsAndComments(source: string): string {
  let s = source
  // Triple-quoted strings first (greedy-safe, non-greedy per block).
  s = s.replace(/'''[\s\S]*?'''/g, '').replace(/"""[\s\S]*?"""/g, '')
  // Single- and double-quoted strings (with escapes).
  s = s.replace(/'(?:\\.|[^'\\\n])*'/g, '').replace(/"(?:\\.|[^"\\\n])*"/g, '')
  // Line comments.
  s = s.replace(/#.*$/gm, '')
  return s
}

export function usesLoopSource(source: string): boolean {
  const stripped = stripStringsAndComments(source)
  return /\bfor\b/.test(stripped) || /\bwhile\b/.test(stripped)
}
