import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  branchVisualizerConfigSchema,
  codeTracerConfigSchema,
  comparisonExplorerConfigSchema,
  functionMachineConfigSchema,
  multiplesGridConfigSchema,
  remainderMachineConfigSchema,
  typeSorterConfigSchema,
  variableBoxConfigSchema,
} from '../../src/problem-types/article/schema'
import { FunctionMachine } from '../../src/problem-types/article/widgets/FunctionMachine'
import { TypeSorter } from '../../src/problem-types/article/widgets/TypeSorter'
import { MultiplesGrid } from '../../src/problem-types/article/widgets/MultiplesGrid'
import { RemainderMachine } from '../../src/problem-types/article/widgets/RemainderMachine'
import { CodeTracer } from '../../src/problem-types/article/widgets/CodeTracer'

// [Phase 9] every widget config schema accepts a representative config
describe('[Phase 9] widget config schemas', () => {
  it('parse valid configs', () => {
    expect(() => functionMachineConfigSchema.parse({ fnName: 'print', cases: [{ input: '"Hi"', output: 'Hi' }] })).not.toThrow()
    expect(() => variableBoxConfigSchema.parse({ name: 'score', values: [0, 10, 25] })).not.toThrow()
    expect(() => typeSorterConfigSchema.parse({ items: [{ label: '7', type: 'number' }, { label: '"hi"', type: 'text' }] })).not.toThrow()
    expect(() => remainderMachineConfigSchema.parse({ divisor: 3, max: 9 })).not.toThrow()
    expect(() => multiplesGridConfigSchema.parse({ upTo: 15, factor: 3 })).not.toThrow()
    expect(() => comparisonExplorerConfigSchema.parse({})).not.toThrow()
    expect(() => branchVisualizerConfigSchema.parse({ conditions: [{ divisor: 3, label: 'Fizz' }] })).not.toThrow()
    expect(() =>
      codeTracerConfigSchema.parse({ code: ['x = 1', 'print(x)'], steps: [{ line: 0, vars: { x: 1 } }, { line: 1, vars: { x: 1 }, output: '1' }] }),
    ).not.toThrow()
  })

  it('rejects bad configs', () => {
    expect(() => typeSorterConfigSchema.parse({ items: [{ label: '7', type: 'integer' }] })).toThrow()
    expect(() => remainderMachineConfigSchema.parse({ divisor: 0, max: 5 })).toThrow()
  })
})

describe('[Phase 9] FunctionMachine', () => {
  it('reveals outputs and completes after the last case', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <FunctionMachine config={{ fnName: 'print', cases: [{ input: '"Hi"', output: 'Hi' }] }} onComplete={onComplete} />,
    )
    await user.click(screen.getByRole('button', { name: /run print/i }))
    expect(screen.getByLabelText('output')).toHaveTextContent('Hi')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

describe('[Phase 9] TypeSorter', () => {
  it('completes only when all items are sorted correctly', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <TypeSorter
        config={{ items: [{ label: '7', type: 'number' }, { label: '"hi"', type: 'text' }] }}
        onComplete={onComplete}
      />,
    )
    const numberButtons = screen.getAllByRole('button', { name: 'number' })
    const textButtons = screen.getAllByRole('button', { name: 'text' })
    await user.click(numberButtons[0])
    expect(onComplete).not.toHaveBeenCalled()
    await user.click(textButtons[1])
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})

describe('[Phase 9] MultiplesGrid', () => {
  it('completes when exactly the multiples are selected', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<MultiplesGrid config={{ upTo: 6, factor: 3 }} onComplete={onComplete} />)
    await user.click(screen.getByRole('button', { name: '3' }))
    await user.click(screen.getByRole('button', { name: '6' }))
    expect(onComplete).toHaveBeenCalled()
  })
})

describe('[Phase 9] RemainderMachine + CodeTracer step to completion', () => {
  it('remainder machine completes at max', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<RemainderMachine config={{ divisor: 3, max: 3 }} onComplete={onComplete} />)
    await user.click(screen.getByRole('button', { name: /next number/i }))
    await user.click(screen.getByRole('button', { name: /next number/i }))
    expect(onComplete).toHaveBeenCalled()
  })

  it('code tracer completes on the last step', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <CodeTracer
        config={{ code: ['x = 1', 'print(x)'], steps: [{ line: 0, vars: { x: 1 } }, { line: 1, vars: { x: 1 }, output: '1' }] }}
        onComplete={onComplete}
      />,
    )
    await user.click(screen.getByRole('button', { name: /step/i }))
    expect(onComplete).toHaveBeenCalled()
    expect(screen.getByLabelText('output')).toHaveTextContent('1')
  })
})
