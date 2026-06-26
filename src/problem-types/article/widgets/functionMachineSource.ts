// Shared source builder for the FunctionMachine "run" mode.
//
// In run mode the widget config carries a real Python script (`code`) that must
// define a function named `fnName`. The widget (and the AI self-test) feed the
// learner's input through that function and show the REAL output, so the
// machine is no longer a fixed echo animation.
//
// The same builder is used by the widget at play time and by the lesson
// validator's self-test, so what gets verified before Sparks are spent is
// exactly what the learner will run.

/** Render an input value as a Python literal for the `fnName(...)` call. */
function toPyArg(input: string, quoted: boolean): string {
  const trimmed = input.trim()
  if (quoted) return JSON.stringify(input) // valid Python str literal for common escapes
  return trimmed
}

/**
 * Builds the runnable Python for a function_machine run demo: the author's
 * `code` (which defines `fnName`) followed by a call that prints the result.
 *
 * The call prints the function's RETURN value when it returns something, so a
 * function that `return`s its answer shows that answer; a function that only
 * prints internally still shows its prints (and no stray `None`).
 */
export function buildFunctionMachineSource(
  fnName: string,
  code: string,
  input: string,
  quoted: boolean,
): string {
  const arg = toPyArg(input, quoted)
  return `${code}\n__fm_out = ${fnName}(${arg})\nif __fm_out is not None:\n    print(__fm_out)`
}
