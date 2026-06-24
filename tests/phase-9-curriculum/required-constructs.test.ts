import { describe, it, expect } from 'vitest'
import { gradePython } from '../../src/lib/grading/pythonGrader'
import { gradeBlocks } from '../../src/lib/grading/blockGrader'
import {
  constructHint,
  missingConstructsSource,
  usesConditionalSource,
  usesModuloSource,
} from '../../src/lib/grading/constructCheck'
import type { CodeNode } from '../../src/lib/blocks/definitions'
import type { PythonRunner } from '../../src/lib/pyodide/runner'

const constRunner = (stdout: string): PythonRunner => async () => ({ stdout, error: null })

describe('[Phase 9] source construct detectors', () => {
  it('detects modulo and if outside strings/comments', () => {
    expect(usesModuloSource('x = i % 3')).toBe(true)
    expect(usesModuloSource('print("100% sure")')).toBe(false)
    expect(usesConditionalSource('if x == 0:\n    pass')).toBe(true)
    expect(usesConditionalSource('print("notify me")')).toBe(false)
  })

  it('reports the missing constructs', () => {
    expect(missingConstructsSource('print(1)', ['loop', 'modulo'])).toEqual(['loop', 'modulo'])
    expect(missingConstructsSource('for i in range(3):\n    print(i % 2)', ['loop', 'modulo'])).toEqual([])
  })

  it('builds a learner hint listing every missing construct', () => {
    expect(constructHint(['modulo'])).toContain('% (remainder)')
    expect(constructHint(['loop', 'conditional'])).toContain(' and ')
    expect(constructHint([])).toBe('')
  })
})

describe('[Phase 9] requiredConstructs (python)', () => {
  const tests = [{ stdin: '', expectedStdout: 'ok' }]

  it('fails when modulo is required but absent', async () => {
    const res = await gradePython('print("ok")', tests, constRunner('ok'), {
      requiredConstructs: ['modulo'],
    })
    expect(res.passed).toBe(false)
    expect(res.missingConstructs).toEqual(['modulo'])
  })

  it('passes when all required constructs are present', async () => {
    const src = 'for i in range(1):\n    if i % 2 == 0:\n        print("ok")'
    const res = await gradePython(src, tests, constRunner('ok'), {
      requiredConstructs: ['loop', 'modulo', 'conditional'],
    })
    expect(res.passed).toBe(true)
    expect(res.missingConstructs).toEqual([])
  })
})

describe('[Phase 9] requiredConstructs (blocks)', () => {
  it('fails correct output that lacks a required conditional', async () => {
    const program: CodeNode[] = [
      { type: 'print', slots: { value: [{ type: 'str', fields: { value: 'hi' } }] } },
    ]
    const res = await gradeBlocks(program, 'hi', constRunner('hi'), {
      requiredConstructs: ['conditional'],
    })
    expect(res.correct).toBe(false)
    expect(res.missingConstructs).toEqual(['conditional'])
  })
})
