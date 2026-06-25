import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  branchVisualizerConfigSchema,
  codeTracerConfigSchema,
  comparisonExplorerConfigSchema,
  decisionMachineConfigSchema,
  functionMachineConfigSchema,
  moduloPickerConfigSchema,
  multiplesGridConfigSchema,
  programStepperConfigSchema,
  rangeMachineConfigSchema,
  remainderMachineConfigSchema,
  typeSorterConfigSchema,
  valueBoxConfigSchema,
  variableBoxConfigSchema,
} from '../../src/problem-types/article/schema'
import { RangeMachine } from '../../src/problem-types/article/widgets/RangeMachine'
import { FunctionMachine } from '../../src/problem-types/article/widgets/FunctionMachine'
import { TypeSorter } from '../../src/problem-types/article/widgets/TypeSorter'
import { ValueBox } from '../../src/problem-types/article/widgets/ValueBox'
import { ModuloPicker, MODULO_PICKER_ITEM_HEIGHT } from '../../src/problem-types/article/widgets/ModuloPicker'
import { ComparisonExplorer } from '../../src/problem-types/article/widgets/ComparisonExplorer'
import { NumberWheel, NUMBER_WHEEL_ITEM_HEIGHT } from '../../src/problem-types/article/widgets/NumberWheel'
import { MultiplesGrid } from '../../src/problem-types/article/widgets/MultiplesGrid'
import { RemainderMachine } from '../../src/problem-types/article/widgets/RemainderMachine'
import { CodeTracer } from '../../src/problem-types/article/widgets/CodeTracer'
import { ProgramStepper } from '../../src/problem-types/article/widgets/ProgramStepper'
import { DecisionMachine } from '../../src/problem-types/article/widgets/DecisionMachine'

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }))
}

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

  it('value_box accepts number and string presets', () => {
    expect(() => valueBoxConfigSchema.parse({ name: 'score', options: [0, 10, 25] })).not.toThrow()
    expect(() =>
      valueBoxConfigSchema.parse({ name: 'word', valueType: 'string', options: ['Hi', 'Hello'] }),
    ).not.toThrow()
    // Needs at least two presets to drag in (to witness an overwrite).
    expect(() => valueBoxConfigSchema.parse({ name: 'score', options: [1] })).toThrow()
  })
})

describe('[shared] NumberWheel — clicky one-per-notch mouse wheel', () => {
  it('steps exactly one number per wheel notch, from the centred value', () => {
    const onSelect = vi.fn()
    render(
      <NumberWheel max={10} selected={5} onSelect={onSelect} reduced ariaLabel="dial" />,
    )
    const wheel = screen.getByRole('listbox', { name: 'dial' }) as HTMLElement
    // Centre is at value 5 (scrollTop = 5 * itemHeight).
    wheel.scrollTop = 5 * NUMBER_WHEEL_ITEM_HEIGHT

    // One notch down → next number up (6), not several.
    fireEvent.wheel(wheel, { deltaY: 120 })
    expect(onSelect).toHaveBeenLastCalledWith(6)
  })

  it('a second notch within the cooldown is ignored (no skating past numbers)', () => {
    const onSelect = vi.fn()
    render(
      <NumberWheel max={10} selected={5} onSelect={onSelect} reduced ariaLabel="dial" />,
    )
    const wheel = screen.getByRole('listbox', { name: 'dial' }) as HTMLElement
    wheel.scrollTop = 5 * NUMBER_WHEEL_ITEM_HEIGHT

    fireEvent.wheel(wheel, { deltaY: 120 })
    fireEvent.wheel(wheel, { deltaY: 120 }) // immediately after → throttled away
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('steps one from the committed value even if scrollTop is mid-glide (no skipping)', () => {
    // Regression: a notch arriving while a previous smooth scroll is still
    // animating used to read the half-step scrollTop, round it up, and jump two
    // — the dial appeared to "skip" a number. The wheel must step from the last
    // committed index instead. Here selected=3 but scrollTop sits at 150 (past
    // the 3→4 midpoint): one notch down must land on 4, not 5.
    const onSelect = vi.fn()
    render(
      <NumberWheel max={10} selected={3} onSelect={onSelect} reduced ariaLabel="dial" />,
    )
    const wheel = screen.getByRole('listbox', { name: 'dial' }) as HTMLElement
    wheel.scrollTop = 3 * NUMBER_WHEEL_ITEM_HEIGHT + NUMBER_WHEEL_ITEM_HEIGHT * 0.75
    fireEvent.wheel(wheel, { deltaY: 120 })
    expect(onSelect).toHaveBeenLastCalledWith(4)
  })

  it('clamps at the ends (cannot step below 0)', () => {
    const onSelect = vi.fn()
    render(
      <NumberWheel max={10} selected={0} onSelect={onSelect} reduced ariaLabel="dial" />,
    )
    const wheel = screen.getByRole('listbox', { name: 'dial' }) as HTMLElement
    wheel.scrollTop = 0
    fireEvent.wheel(wheel, { deltaY: -120 })
    expect(onSelect).toHaveBeenLastCalledWith(0)
  })
})

describe('[L3] ModuloPicker — iPhone-alarm-style remainder picker', () => {
  // Scroll the wheel so that slot `n` is centred (selected), the way an
  // iPhone-alarm dial works: round(scrollTop / itemHeight) === n.
  function scrollToCentre(wheel: Element, n: number) {
    ;(wheel as HTMLElement).scrollTop = n * MODULO_PICKER_ITEM_HEIGHT
    fireEvent.scroll(wheel)
  }

  it('schema accepts valid configs and applies defaults, rejecting bad ones', () => {
    const def = moduloPickerConfigSchema.parse({})
    expect(def.max).toBe(15)
    expect(def.divisor).toBe(3)
    expect(() => moduloPickerConfigSchema.parse({ max: 9, divisor: 4 })).not.toThrow()
    expect(() => moduloPickerConfigSchema.parse({ divisor: 0 })).toThrow()
    expect(() => moduloPickerConfigSchema.parse({ max: -1 })).toThrow()
  })

  it('renders a scroller of every number 0..max and a remainder output, with the centre value selected up front', () => {
    mockMatchMedia(false)
    render(<ModuloPicker config={{ max: 15, divisor: 3 }} />)
    // Every number 0..15 is present in the wheel.
    for (let n = 0; n <= 15; n++) {
      expect(screen.getByRole('option', { name: `select ${n}` })).toBeTruthy()
    }
    expect(screen.getByLabelText('remainder')).toBeTruthy()
    // No click needed: the centre (0) is selected immediately, so 0 % 3 = 0 shows.
    expect(screen.getByRole('option', { name: 'select 0' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('remainder')).toHaveTextContent('0')
  })

  it('the CENTRED (scrolled-to) number drives the output, with no click required — cycling 0,1,2', () => {
    mockMatchMedia(false)
    render(<ModuloPicker config={{ max: 15, divisor: 3 }} />)
    const out = screen.getByLabelText('remainder')
    const wheel = screen.getByRole('listbox')

    scrollToCentre(wheel, 7)
    expect(out).toHaveTextContent('1') // 7 % 3 = 1
    expect(screen.getByRole('option', { name: 'select 7' })).toHaveAttribute('aria-selected', 'true')

    scrollToCentre(wheel, 6)
    expect(out).toHaveTextContent('0') // 6 % 3 = 0

    scrollToCentre(wheel, 8)
    expect(out).toHaveTextContent('2') // 8 % 3 = 2
  })

  it('tapping a number also centres/selects it (keyboard + a11y convenience)', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    render(<ModuloPicker config={{ max: 15, divisor: 4 }} />)
    await user.click(screen.getByRole('option', { name: 'select 9' }))
    expect(screen.getByLabelText('remainder')).toHaveTextContent('1') // 9 % 4 = 1
  })

  it('does not label or point out the "multiple" trend anywhere in its UI', () => {
    mockMatchMedia(false)
    const { container } = render(<ModuloPicker config={{ max: 15, divisor: 3 }} />)
    expect(container.textContent?.toLowerCase()).not.toContain('multiple')
  })

  it('completes once the learner has scrolled through a full remainder cycle', async () => {
    mockMatchMedia(false)
    const onComplete = vi.fn()
    render(<ModuloPicker config={{ max: 15, divisor: 3 }} onComplete={onComplete} />)
    const wheel = screen.getByRole('listbox')
    // Scroll across enough distinct centres to see the remainder cycle 0,1,2,0.
    for (const n of [1, 2, 3]) {
      scrollToCentre(wheel, n)
    }
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
  })

  it('respects prefers-reduced-motion (no smooth scroll/animation)', () => {
    mockMatchMedia(true)
    const { container } = render(<ModuloPicker config={{ max: 15, divisor: 3 }} />)
    const root = container.querySelector('[data-widget="modulo_picker"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
    // Reduced motion still drives selection by centre, just without smooth scroll.
    const wheel = screen.getByRole('listbox')
    scrollToCentre(wheel, 5)
    expect(screen.getByLabelText('remainder')).toHaveTextContent('2') // 5 % 3 = 2
  })
})

describe('[L4] ComparisonExplorer — tactile scroll-selector comparison', () => {
  // Scroll a wheel so slot `n` is centred (selected), exactly like the iPhone
  // alarm dial reused from ModuloPicker: round(scrollTop / itemHeight) === n.
  function scrollWheelTo(wheel: Element, n: number) {
    ;(wheel as HTMLElement).scrollTop = n * NUMBER_WHEEL_ITEM_HEIGHT
    fireEvent.scroll(wheel)
  }

  it('schema accepts a configurable max and defaults it', () => {
    expect(comparisonExplorerConfigSchema.parse({}).max).toBe(10)
    expect(() => comparisonExplorerConfigSchema.parse({ left: 2, right: 4, max: 9 })).not.toThrow()
    expect(() => comparisonExplorerConfigSchema.parse({ max: 0 })).toThrow()
  })

  it('renders two scroll wheels (left/right numbers) and an operator, with a live result', () => {
    mockMatchMedia(false)
    const { container } = render(<ComparisonExplorer config={{ left: 3, right: 5, max: 10 }} />)
    expect(screen.getByRole('listbox', { name: 'left number' })).toBeTruthy()
    expect(screen.getByRole('listbox', { name: 'right number' })).toBeTruthy()
    expect(screen.getByLabelText('operator')).toBeTruthy()
    // 3 == 5 → False shows immediately, no click needed.
    const result = container.querySelector('.ce-result')!
    expect(result).toHaveTextContent('False')
    expect(result.querySelector('.is-false')).toBeTruthy()
  })

  it('offers ONLY the taught operators (==, >, <) — not the untaught ones', () => {
    mockMatchMedia(false)
    render(<ComparisonExplorer config={{ left: 3, right: 5, max: 10 }} />)
    const operator = screen.getByLabelText('operator') as HTMLSelectElement
    const offered = Array.from(operator.options).map((o) => o.value)
    expect(offered).toEqual(['==', '>', '<'])
    // The untaught comparators must be gone (they'd confuse a beginner).
    for (const untaught of ['!=', '<=', '>=']) {
      expect(offered).not.toContain(untaught)
    }
  })

  it('updates the True/False result live as a wheel is scrolled (centre = selected)', () => {
    mockMatchMedia(false)
    const { container } = render(<ComparisonExplorer config={{ left: 3, right: 5, max: 10 }} />)
    const leftWheel = screen.getByRole('listbox', { name: 'left number' })
    // Scroll the left wheel to 5 → 5 == 5 → True.
    scrollWheelTo(leftWheel, 5)
    const result = container.querySelector('.ce-result')!
    expect(result).toHaveTextContent('True')
    expect(result.querySelector('.is-true')).toBeTruthy()
    // Within the left wheel, 5 is now the selected option (no click happened).
    expect(within(leftWheel).getByRole('option', { name: 'select 5' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // Scroll it back to 2 → 2 == 5 → False again.
    scrollWheelTo(leftWheel, 2)
    expect(container.querySelector('.ce-result')).toHaveTextContent('False')
  })

  it('respects prefers-reduced-motion but still selects by centre on scroll', () => {
    mockMatchMedia(true)
    const { container } = render(<ComparisonExplorer config={{ left: 4, right: 4, max: 10 }} />)
    const root = container.querySelector('[data-widget="comparison_explorer"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
    // 4 == 4 → True up front.
    expect(container.querySelector('.ce-result')).toHaveTextContent('True')
    // Scrolling still drives the selection under reduced motion.
    scrollWheelTo(screen.getByRole('listbox', { name: 'right number' }), 7)
    expect(container.querySelector('.ce-result')).toHaveTextContent('False') // 4 == 7
  })

  it('completes once the learner has produced both a True and a False', async () => {
    mockMatchMedia(false)
    const onComplete = vi.fn()
    render(<ComparisonExplorer config={{ left: 3, right: 5, max: 10 }} onComplete={onComplete} />)
    // Starts False (3 == 5); scroll left to 5 to also witness True.
    scrollWheelTo(screen.getByRole('listbox', { name: 'left number' }), 5)
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
  })
})

describe('[L2] ValueBox — drop a value into the box', () => {
  it('draws a named box and the preset draggable options', () => {
    mockMatchMedia(false)
    render(<ValueBox config={{ name: 'score', options: [0, 10, 25] }} />)
    expect(screen.getByLabelText('box score')).toBeTruthy()
    // each preset is a draggable chip
    expect(screen.getByLabelText('drag 0')).toBeTruthy()
    expect(screen.getByLabelText('drag 10')).toBeTruthy()
    expect(screen.getByLabelText('drag 25')).toBeTruthy()
  })

  it('updates the box value on drop and overwrites with a later drop', async () => {
    mockMatchMedia(false)
    const onComplete = vi.fn()
    render(<ValueBox config={{ name: 'score', options: [10, 25] }} onComplete={onComplete} />)
    const box = screen.getByLabelText('box score')
    expect(box).toHaveTextContent('empty')

    fireEvent.dragStart(screen.getByLabelText('drag 10'))
    fireEvent.drop(box)
    expect(box).toHaveTextContent('10')
    // one drop is not enough to demonstrate the overwrite
    expect(onComplete).not.toHaveBeenCalled()

    fireEvent.dragStart(screen.getByLabelText('drag 25'))
    fireEvent.drop(box)
    expect(box).toHaveTextContent('25')
    expect(box).not.toHaveTextContent('10')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('renders string presets in quotes', () => {
    mockMatchMedia(false)
    render(<ValueBox config={{ name: 'word', valueType: 'string', options: ['Hi', 'Hello'] }} />)
    const box = screen.getByLabelText('box word')
    fireEvent.dragStart(screen.getByLabelText('drag "Hi"'))
    fireEvent.drop(box)
    expect(box).toHaveTextContent('"Hi"')
  })

  it('respects prefers-reduced-motion (instant, no slide)', () => {
    mockMatchMedia(true)
    const { container } = render(<ValueBox config={{ name: 'score', options: [10, 25] }} />)
    const root = container.querySelector('[data-widget="value_box"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
  })

  it('draggable chips use the theme-aware text token so they read in light + dark mode', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8')
    const chipRule = css.match(/\.vbx-chip\s*\{[^}]*\}/)?.[0] ?? ''
    expect(chipRule).toContain('color: var(--color-text)')
    // Guard against a regression to a hardcoded white that broke light mode.
    expect(chipRule).not.toMatch(/color:\s*(#fff|#ffffff|white)/i)
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

describe('[L1] FunctionMachine assembly-line animation', () => {
  function mockMatchMedia(reduce: boolean) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }))
  }

  it('renders an assembly line: input, a machine, and an output console', () => {
    mockMatchMedia(false)
    const { container } = render(
      <FunctionMachine config={{ fnName: 'print', cases: [{ input: '"Hi"', output: 'Hi' }] }} />,
    )
    expect(container.querySelector('.fm-line')).toBeTruthy()
    expect(container.querySelector('[data-machine]')).toBeTruthy()
    expect(screen.getByLabelText('input')).toBeTruthy()
    expect(screen.getByLabelText('output')).toBeTruthy()
  })

  it('animates by default and marks parts in-flight on Run', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(
      <FunctionMachine config={{ fnName: 'print', cases: [{ input: '"Hi"', output: 'Hi' }] }} />,
    )
    const root = container.querySelector('[data-widget="function_machine"]')!
    expect(root.getAttribute('data-motion')).toBe('full')
    await user.click(screen.getByRole('button', { name: /run print/i }))
    expect(root.getAttribute('data-running')).toBe('true')
  })

  it('respects prefers-reduced-motion (instant, no animation)', () => {
    mockMatchMedia(true)
    const { container } = render(
      <FunctionMachine config={{ fnName: 'print', cases: [{ input: '"Hi"', output: 'Hi' }] }} />,
    )
    const root = container.querySelector('[data-widget="function_machine"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
  })
})

describe('[L1] FunctionMachine editable input + echo typewriter', () => {
  const editableConfig = {
    fnName: 'print',
    editable: true,
    echoInput: true,
    cases: [{ input: 'Hello!', output: 'Hello!' }],
  }

  it('schema accepts the opt-in editable/echo flags', () => {
    expect(() => functionMachineConfigSchema.parse(editableConfig)).not.toThrow()
    // both flags default to false (preset mode) when omitted
    const preset = functionMachineConfigSchema.parse({ fnName: 'double', cases: [{ input: '4', output: '8' }] })
    expect(preset.editable).toBe(false)
    expect(preset.echoInput).toBe(false)
  })

  it('renders one "Input:" block with the field — no print( ) wrapper around it', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<FunctionMachine config={editableConfig} />)
    const block = container.querySelector('.fm-edit-block')!
    expect(block).toBeTruthy()
    expect(block.textContent).toMatch(/input:/i)
    // The input area must NOT wrap the field in a print(...) literal.
    expect(block.textContent).not.toMatch(/print\(/)
    const field = screen.getByRole('textbox', { name: /input text/i }) as HTMLInputElement
    expect(field.value).toBe('Hello!')
    await user.clear(field)
    await user.type(field, 'Pizza')
    expect(field.value).toBe('Pizza')
  })

  it('on Run, the Input block is consumed and the console types the entered text', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<FunctionMachine config={editableConfig} />)
    const field = screen.getByRole('textbox', { name: /input text/i })
    await user.clear(field)
    await user.type(field, 'Banana')
    // Output box starts empty.
    expect(screen.getByLabelText('output').textContent).toBe('')
    await user.click(screen.getByRole('button', { name: /run print/i }))
    // The whole Input block is consumed / in-flight into the machine.
    expect(container.querySelector('.fm-edit-block')?.getAttribute('data-phase')).toBe('consuming')
    await waitFor(
      () => {
        expect(screen.getByLabelText('output').textContent).toBe('Banana')
      },
      { timeout: 5000 },
    )
  })

  it('the Input block reappears (slides in from the right) and a second Run works', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<FunctionMachine config={editableConfig} />)
    const field = screen.getByRole('textbox', { name: /input text/i }) as HTMLInputElement
    await user.clear(field)
    await user.type(field, 'Banana')
    await user.click(screen.getByRole('button', { name: /run print/i }))
    // After the line finishes printing, the Input block comes back (reappearing).
    await waitFor(
      () => {
        expect(screen.getByLabelText('output').textContent).toBe('Banana')
        expect(container.querySelector('.fm-edit-block')?.getAttribute('data-phase')).toBe('reappearing')
      },
      { timeout: 5000 },
    )
    // It is editable again: change the text and Run a second time.
    await user.clear(field)
    await user.type(field, 'Mango')
    expect(field.value).toBe('Mango')
    await user.click(screen.getByRole('button', { name: /run print/i }))
    await waitFor(
      () => {
        expect(screen.getByLabelText('output').textContent).toBe('Mango')
      },
      { timeout: 5000 },
    )
  })

  it('shows a caret while typing and removes it once the line has printed', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<FunctionMachine config={editableConfig} />)
    const field = screen.getByRole('textbox', { name: /input text/i })
    await user.clear(field)
    await user.type(field, 'Banana')
    await user.click(screen.getByRole('button', { name: /run print/i }))
    // Caret is visible during typing.
    expect(container.querySelector('.fm-caret')).toBeTruthy()
    // ...and disappears once printing finishes.
    await waitFor(
      () => {
        expect(screen.getByLabelText('output').textContent).toBe('Banana')
        expect(container.querySelector('.fm-caret')).toBeNull()
      },
      { timeout: 5000 },
    )
  })

  it('reduced motion fills the output instantly with no caret, and stays editable', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    const { container } = render(
      <FunctionMachine config={{ ...editableConfig, cases: [{ input: 'Hi', output: 'Hi' }] }} />,
    )
    const field = screen.getByRole('textbox', { name: /input text/i }) as HTMLInputElement
    await user.click(screen.getByRole('button', { name: /run print/i }))
    expect(screen.getByLabelText('output').textContent).toBe('Hi')
    expect(container.querySelector('.fm-caret')).toBeNull()
    // Reduced motion: the Input block reappears instantly (no slide animation).
    expect(container.querySelector('.fm-edit-block')?.getAttribute('data-phase')).toBe('ready')
    // Still editable + a second Run works.
    await user.clear(field)
    await user.type(field, 'Yo')
    expect(field.value).toBe('Yo')
    await user.click(screen.getByRole('button', { name: /run print/i }))
    expect(screen.getByLabelText('output').textContent).toBe('Yo')
  })

  it('the machine morphs to the exact print("...") call for the entered text', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<FunctionMachine config={editableConfig} />)
    const field = screen.getByRole('textbox', { name: /input text/i })
    const label = () => container.querySelector('.fm-machine-label')!
    // Static before any run.
    expect(label().textContent).toBe('print( )')
    await user.clear(field)
    await user.type(field, 'Mango')
    await user.click(screen.getByRole('button', { name: /run print/i }))
    // As the input is consumed, the machine shows the exact Python call.
    expect(label().textContent).toBe('print("Mango")')
  })

  it('shows the exact print("...") syntax under reduced motion too', async () => {
    mockMatchMedia(true)
    const user = userEvent.setup()
    const { container } = render(<FunctionMachine config={editableConfig} />)
    const field = screen.getByRole('textbox', { name: /input text/i })
    await user.clear(field)
    await user.type(field, 'Kiwi')
    await user.click(screen.getByRole('button', { name: /run print/i }))
    expect(container.querySelector('.fm-machine-label')?.textContent).toBe('print("Kiwi")')
  })

  it('preset-cases mode (L8 usage) is unchanged: no Input block, no text field, preset output, static label', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<FunctionMachine config={{ fnName: 'double', cases: [{ input: '4', output: '8' }] }} />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(container.querySelector('.fm-edit-block')).toBeNull()
    expect(container.querySelector('.fm-caret')).toBeNull()
    await user.click(screen.getByRole('button', { name: /run double/i }))
    expect(screen.getByLabelText('output')).toHaveTextContent('8')
    // The preset machine never morphs into a dynamic call.
    const label = container.querySelector('.fm-machine-label')
    expect(label?.textContent).toBe('double( )')
    expect(label?.textContent).not.toMatch(/double\("/)
  })
})

describe('[L2] TypeSorter — Keep-Talking-style flow', () => {
  it('shows one word in a large central box with option buttons below', () => {
    mockMatchMedia(false)
    const { container } = render(
      <TypeSorter
        config={{ items: [{ label: '7', type: 'number' }, { label: '"hi"', type: 'text' }] }}
      />,
    )
    // Exactly one word is presented at a time, in a central box.
    const current = container.querySelector('.ts-current')!
    expect(current).toBeTruthy()
    expect(current).toHaveTextContent('7')
    expect(current).not.toHaveTextContent('"hi"')
    // The answer options are buttons.
    expect(screen.getByRole('button', { name: 'number' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'text' })).toBeTruthy()
  })

  it('advances to the next word on a correct answer, and a wrong answer does not advance', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const { container } = render(
      <TypeSorter
        config={{ items: [{ label: '7', type: 'number' }, { label: '"hi"', type: 'text' }] }}
        onComplete={onComplete}
      />,
    )
    const current = () => container.querySelector('.ts-current')!

    // Wrong answer on the first word: stays on the same word.
    await user.click(screen.getByRole('button', { name: 'text' }))
    expect(current()).toHaveTextContent('7')
    expect(onComplete).not.toHaveBeenCalled()

    // Correct: advances to the next word.
    await user.click(screen.getByRole('button', { name: 'number' }))
    expect(current()).toHaveTextContent('"hi"')
    expect(onComplete).not.toHaveBeenCalled()

    // Correct on the last word: completes.
    await user.click(screen.getByRole('button', { name: 'text' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('respects prefers-reduced-motion', () => {
    mockMatchMedia(true)
    const { container } = render(
      <TypeSorter config={{ items: [{ label: '7', type: 'number' }, { label: '"hi"', type: 'text' }] }} />,
    )
    const root = container.querySelector('[data-widget="type_sorter"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
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

describe('[L5] ProgramStepper — the decision machine', () => {
  const fizzBuzz = {
    variable: 'n',
    conditions: [
      { divisor: 3, prints: 'Fizz' },
      { divisor: 5, prints: 'Buzz' },
    ],
    elseLabel: 'the number itself',
    defaultInput: 6,
  }

  function currentLine(container: HTMLElement): string {
    return container.querySelector('.ps-line.is-current code')?.textContent ?? ''
  }
  function output(container: HTMLElement): string {
    return container.querySelector('.ps-output .console')?.textContent ?? ''
  }
  function setInput(value: string) {
    fireEvent.change(screen.getByLabelText('input number'), { target: { value } })
  }

  it('schema accepts a valid config (with defaults) and rejects bad ones', () => {
    const def = programStepperConfigSchema.parse({ conditions: [{ divisor: 3, prints: 'Fizz' }] })
    expect(def.variable).toBe('n')
    expect(def.defaultInput).toBe(6)
    expect(() => programStepperConfigSchema.parse({ conditions: [] })).toThrow()
    expect(() => programStepperConfigSchema.parse({ conditions: [{ divisor: 0, prints: 'x' }] })).toThrow()
    expect(() => programStepperConfigSchema.parse({ conditions: [{ divisor: 3, prints: '' }] })).toThrow()
  })

  it('renders the READ-ONLY if/elif/else program and an input field to the side', () => {
    mockMatchMedia(false)
    const { container } = render(<ProgramStepper config={fizzBuzz} />)
    const code = container.querySelector('.ps-code')!.textContent ?? ''
    expect(code).toContain('if n % 3 == 0:')
    expect(code).toContain('print("Fizz")')
    expect(code).toContain('elif n % 5 == 0:')
    expect(code).toContain('print("Buzz")')
    expect(code).toContain('else:')
    expect(code).toContain('print(n)')
    // There is an input field for the abstracted-away number, prefilled to 6.
    const input = screen.getByLabelText('input number') as HTMLInputElement
    expect(input.value).toBe('6')
    // There is no "run it all" control — only stepping.
    expect(screen.queryByRole('button', { name: /^run/i })).toBeNull()
    expect(screen.getByRole('button', { name: /step/i })).toBeTruthy()
  })

  it('steps line by line with commentary, taking the if branch for a multiple of 3', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<ProgramStepper config={fizzBuzz} />)
    // First step highlights the if line; commentary says the check is True for 6.
    expect(currentLine(container)).toContain('if n % 3 == 0:')
    expect(container.querySelector('.ps-commentary')?.textContent?.toLowerCase()).toContain('true')
    expect(output(container)).toContain('nothing')
    // Stepping runs the body and prints Fizz.
    await user.click(screen.getByRole('button', { name: /step/i }))
    expect(currentLine(container)).toContain('print("Fizz")')
    expect(output(container)).toContain('Fizz')
  })

  it('a different input changes which branch is taken (resetting the walk-through)', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<ProgramStepper config={fizzBuzz} />)

    // 10 is a multiple of 5 (not 3): the elif branch wins → prints Buzz.
    setInput('10')
    expect(currentLine(container)).toContain('if n % 3 == 0:') // reset to the top
    await user.click(screen.getByRole('button', { name: /step/i }))
    expect(currentLine(container)).toContain('elif n % 5 == 0:')
    await user.click(screen.getByRole('button', { name: /step/i }))
    expect(output(container)).toContain('Buzz')

    // 7 matches nothing: it falls through to else and prints the number itself.
    setInput('7')
    await user.click(screen.getByRole('button', { name: /step/i })) // -> elif
    await user.click(screen.getByRole('button', { name: /step/i })) // -> else header
    await user.click(screen.getByRole('button', { name: /step/i })) // -> else body
    expect(output(container)).toContain('7')
    expect(output(container)).not.toContain('Fizz')
    expect(output(container)).not.toContain('Buzz')
  })

  it('completes once the learner steps all the way to the printed result', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<ProgramStepper config={fizzBuzz} onComplete={onComplete} />)
    await user.click(screen.getByRole('button', { name: /step/i }))
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
  })

  it('respects prefers-reduced-motion', () => {
    mockMatchMedia(true)
    const { container } = render(<ProgramStepper config={fizzBuzz} />)
    const root = container.querySelector('[data-widget="program_stepper"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
    // Stepping still works without motion.
    expect(container.querySelector('.ps-line.is-current')).toBeTruthy()
  })
})

describe('[L6] ProgramStepper — loop mode (step through a for-loop)', () => {
  // A counting loop that adds 3 each turn, mirroring the drag-to-15 tedium demo:
  // for i in range(3): total = total + 3; print(total)  → 3, 6, 9.
  const countingLoop = {
    mode: 'loop',
    loopVar: 'i',
    start: 0,
    stop: 3,
    accumulator: { name: 'total', init: 0, step: 3 },
  }

  function currentLine(container: HTMLElement): string {
    return container.querySelector('.ps-line.is-current code')?.textContent ?? ''
  }
  function output(container: HTMLElement): string {
    return container.querySelector('.ps-output .console')?.textContent ?? ''
  }
  function vars(container: HTMLElement): string {
    return container.querySelector('.ps-vars')?.textContent ?? ''
  }

  it('schema accepts a loop config and the decision config still parses (L5-safe)', () => {
    expect(() => programStepperConfigSchema.parse(countingLoop)).not.toThrow()
    // A simple print-the-loop-var loop (no accumulator) is valid too.
    expect(() => programStepperConfigSchema.parse({ mode: 'loop', stop: 5 })).not.toThrow()
    // Loop mode requires a positive stop.
    expect(() => programStepperConfigSchema.parse({ mode: 'loop' })).toThrow()
    expect(() => programStepperConfigSchema.parse({ mode: 'loop', stop: 0 })).toThrow()
    // The L5 decision config (no `mode`) still parses with its defaults.
    const decision = programStepperConfigSchema.parse({ conditions: [{ divisor: 3, prints: 'Fizz' }] })
    expect(decision.mode).toBe('decision')
  })

  it('renders the read-only for-loop program (header + body) with no input field', () => {
    mockMatchMedia(false)
    const { container } = render(<ProgramStepper config={countingLoop} />)
    const code = container.querySelector('.ps-code')!.textContent ?? ''
    expect(code).toContain('total = 0')
    expect(code).toContain('for i in range(3):')
    expect(code).toContain('total = total + 3')
    expect(code).toContain('print(total)')
    // Loop mode has no "input number" field (that is the decision machine).
    expect(screen.queryByLabelText('input number')).toBeNull()
    expect(screen.getByRole('button', { name: /^step$/i })).toBeTruthy()
  })

  it('shows the value of i and the console output update at each step, with commentary', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<ProgramStepper config={countingLoop} />)

    // First step: the for-header gives i its first value (0); nothing printed yet.
    expect(currentLine(container)).toContain('for i in range(3):')
    expect(vars(container)).toContain('i')
    expect(vars(container)).toContain('0')
    expect(container.querySelector('.ps-commentary')?.textContent?.trim().length).toBeGreaterThan(0)
    expect(output(container)).toContain('nothing')

    // Step to the accumulate line, then the print line → console shows 3.
    await user.click(screen.getByRole('button', { name: /^step$/i }))
    expect(currentLine(container)).toContain('total = total + 3')
    await user.click(screen.getByRole('button', { name: /^step$/i }))
    expect(currentLine(container)).toContain('print(total)')
    expect(output(container)).toContain('3')
  })

  it('grows a real console across iterations (3, 6, 9) and completes at the end', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const { container } = render(<ProgramStepper config={countingLoop} onComplete={onComplete} />)

    const stepBtn = () => screen.getByRole('button', { name: /^step$/i }) as HTMLButtonElement
    for (let i = 0; i < 40 && !stepBtn().disabled; i++) {
      await user.click(stepBtn())
    }
    const out = output(container)
    expect(out).toContain('3')
    expect(out).toContain('6')
    expect(out).toContain('9')
    expect(onComplete).toHaveBeenCalled()
  })

  it('respects prefers-reduced-motion in loop mode', () => {
    mockMatchMedia(true)
    const { container } = render(<ProgramStepper config={countingLoop} />)
    const root = container.querySelector('[data-widget="program_stepper"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
    expect(container.querySelector('.ps-line.is-current')).toBeTruthy()
  })
})

describe('[L6] RangeMachine — number-wheel range builder / collapse demo', () => {
  function scrollWheelTo(wheel: Element, n: number) {
    ;(wheel as HTMLElement).scrollTop = n * NUMBER_WHEEL_ITEM_HEIGHT
    fireEvent.scroll(wheel)
  }
  function call(container: HTMLElement): string {
    return container.querySelector('.rm-call')?.textContent ?? ''
  }
  function list(container: HTMLElement): string {
    return container.querySelector('.rm-list')?.textContent ?? ''
  }
  function stepBtn() {
    return screen.getByRole('button', { name: /^step$/i }) as HTMLButtonElement
  }

  it('schema applies defaults and rejects bad configs', () => {
    const def = rangeMachineConfigSchema.parse({})
    expect(def.start).toBe(0)
    expect(def.plusOne).toBe(false)
    expect(def.max).toBeGreaterThan(0)
    expect(() => rangeMachineConfigSchema.parse({ max: 0 })).toThrow()
    expect(() => rangeMachineConfigSchema.parse({ start: -1 })).toThrow()
  })

  it('(6.2b) simple mode range(n): substitutes n, then expands to 0..n-1 (stops before n)', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<RangeMachine config={{ start: 0, plusOne: false, max: 9, initial: 5 }} />)
    // Phase 0: the symbolic call.
    expect(call(container)).toContain('range(n)')
    // Substitute n → 5.
    await user.click(stepBtn())
    expect(call(container)).toContain('range(5)')
    // Expand → 0,1,2,3,4 (and NOT 5: it stops before n).
    await user.click(stepBtn())
    const produced = list(container)
    for (const n of ['0', '1', '2', '3', '4']) expect(produced).toContain(n)
    expect(produced.split(/\D+/).filter(Boolean)).not.toContain('5')
  })

  it('(6.5) collapse mode range(1, n + 1): substitute → compute → expand to 1..n', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const { container } = render(
      <RangeMachine config={{ start: 1, plusOne: true, max: 9, initial: 5 }} onComplete={onComplete} />,
    )
    // Phase 0: the expression still has the variable n.
    expect(call(container)).toContain('range(1, n + 1)')
    // Substitute: n becomes its value 5.
    await user.click(stepBtn())
    expect(call(container)).toContain('range(1, 5 + 1)')
    // Compute: 5 + 1 collapses to the single value 6 BEFORE the loop runs.
    await user.click(stepBtn())
    expect(call(container)).toContain('range(1, 6)')
    // Expand: the produced numbers 1..5 appear.
    await user.click(stepBtn())
    const produced = list(container)
    for (const n of ['1', '2', '3', '4', '5']) expect(produced).toContain(n)
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
  })

  it('(6.5) picking a different n on the wheel re-collapses to the new sequence', async () => {
    mockMatchMedia(false)
    const user = userEvent.setup()
    const { container } = render(<RangeMachine config={{ start: 1, plusOne: true, max: 9, initial: 5 }} />)
    // Scroll the wheel to 3 → range(1, 3 + 1) → 1,2,3.
    scrollWheelTo(screen.getByRole('listbox'), 3)
    expect(call(container)).toContain('range(1, n + 1)') // re-armed at the symbolic step
    await user.click(stepBtn())
    expect(call(container)).toContain('range(1, 3 + 1)')
    await user.click(stepBtn())
    expect(call(container)).toContain('range(1, 4)')
    await user.click(stepBtn())
    const produced = list(container)
    for (const n of ['1', '2', '3']) expect(produced).toContain(n)
    expect(produced.split(/\D+/).filter(Boolean)).not.toContain('4')
  })

  it('respects prefers-reduced-motion', () => {
    mockMatchMedia(true)
    const { container } = render(<RangeMachine config={{ start: 1, plusOne: true, max: 9, initial: 5 }} />)
    const root = container.querySelector('[data-widget="range_machine"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
  })
})

describe('[L5] DecisionMachine — learner-driven dial routes control flow', () => {
  // Scroll the shared NumberWheel so slot `n` is centred (selected): exactly the
  // iPhone-alarm dial mechanism, round(scrollTop / itemHeight) === n.
  function scrollDialTo(wheel: Element, n: number) {
    ;(wheel as HTMLElement).scrollTop = n * NUMBER_WHEEL_ITEM_HEIGHT
    fireEvent.scroll(wheel)
  }
  function activeBranch(container: HTMLElement): string {
    return container.querySelector('.dm-branch.is-active code')?.textContent ?? ''
  }
  function output(container: HTMLElement): string {
    return container.querySelector('.dm-output .console')?.textContent ?? ''
  }

  const ifOnly = {
    variable: 'n',
    conditions: [{ divisor: 3, label: 'say "multiple of 3"', prints: 'multiple of 3' }],
    hasElse: false,
    max: 9,
    initial: 1,
  }
  const ifElse = {
    variable: 'n',
    conditions: [{ divisor: 3, label: 'say "multiple of 3"', prints: 'multiple of 3' }],
    hasElse: true,
    elseLabel: 'print the number',
    max: 9,
    initial: 1,
  }
  const multi = {
    variable: 'n',
    conditions: [
      { divisor: 3, label: 'multiple of 3', prints: 'multiple of 3' },
      { divisor: 5, label: 'multiple of 5', prints: 'multiple of 5' },
    ],
    hasElse: true,
    elseLabel: 'print the number',
    max: 15,
    initial: 1,
  }

  it('schema accepts valid configs (with defaults) and rejects bad ones', () => {
    const def = decisionMachineConfigSchema.parse({
      conditions: [{ divisor: 3, label: 'multiple of 3', prints: 'multiple of 3' }],
    })
    expect(def.variable).toBe('n')
    expect(def.hasElse).toBe(true)
    expect(def.max).toBe(15)
    expect(def.initial).toBe(1)
    // hasElse: false (the if-only shape) is allowed.
    expect(() => decisionMachineConfigSchema.parse({ ...ifOnly })).not.toThrow()
    // Must have at least one condition; divisor positive; prints/label non-empty.
    expect(() => decisionMachineConfigSchema.parse({ conditions: [] })).toThrow()
    expect(() => decisionMachineConfigSchema.parse({ conditions: [{ divisor: 0, label: 'x', prints: 'x' }] })).toThrow()
    expect(() => decisionMachineConfigSchema.parse({ conditions: [{ divisor: 3, label: 'x', prints: '' }] })).toThrow()
  })

  it('renders the dial and the if/else program, lighting nothing for the initial miss', () => {
    mockMatchMedia(false)
    const { container } = render(<DecisionMachine config={ifElse} />)
    // The dial is the shared NumberWheel, labelled "input number".
    expect(screen.getByRole('listbox', { name: 'input number' })).toBeTruthy()
    const code = container.querySelector('.dm-branches')!.textContent ?? ''
    expect(code).toContain('if n % 3 == 0:')
    expect(code).toContain('else:')
    // n starts at 1 → no branch matches, so the else lights and it prints the number.
    expect(activeBranch(container)).toContain('else:')
    expect(output(container)).toContain('1')
  })

  it('if-only shape: prints nothing on a miss, lights the inside line only on multiples (no else line)', () => {
    mockMatchMedia(false)
    const { container } = render(<DecisionMachine config={ifOnly} />)
    // No else line is rendered in the if-only shape.
    expect(container.querySelector('.dm-branches')!.textContent).not.toContain('else:')
    // n = 1 is not a multiple of 3: nothing lights, nothing prints.
    expect(container.querySelector('.dm-branch.is-active')).toBeNull()
    expect(output(container)).toContain('nothing')
    // Scroll to 3: the inside line lights and the message prints.
    scrollDialTo(screen.getByRole('listbox', { name: 'input number' }), 3)
    expect(activeBranch(container)).toContain('if n % 3 == 0:')
    expect(output(container)).toContain('multiple of 3')
  })

  it('scrolling the dial re-routes which branch lights and what prints', () => {
    mockMatchMedia(false)
    const { container } = render(<DecisionMachine config={ifElse} />)
    const dial = screen.getByRole('listbox', { name: 'input number' })
    scrollDialTo(dial, 6) // multiple of 3 → if branch
    expect(activeBranch(container)).toContain('if n % 3 == 0:')
    expect(output(container)).toContain('multiple of 3')
    scrollDialTo(dial, 7) // not a multiple → else
    expect(activeBranch(container)).toContain('else:')
    expect(output(container)).toContain('7')
  })

  it('first matching branch wins when several conditions are True (15 is a multiple of 3 AND 5)', () => {
    mockMatchMedia(false)
    const { container } = render(<DecisionMachine config={multi} />)
    scrollDialTo(screen.getByRole('listbox', { name: 'input number' }), 15)
    // Only the FIRST matching branch (multiple of 3) lights — not the elif.
    expect(activeBranch(container)).toContain('if n % 3 == 0:')
    expect(activeBranch(container)).not.toContain('elif')
    expect(output(container)).toContain('multiple of 3')
    expect(output(container)).not.toContain('multiple of 5')
  })

  it('completes once the learner has made two different outcomes light up', async () => {
    mockMatchMedia(false)
    const onComplete = vi.fn()
    render(<DecisionMachine config={ifElse} onComplete={onComplete} />)
    // Starts on a miss (else). Scroll to a multiple of 3 to light the if branch.
    expect(onComplete).not.toHaveBeenCalled()
    scrollDialTo(screen.getByRole('listbox', { name: 'input number' }), 3)
    await waitFor(() => expect(onComplete).toHaveBeenCalled())
  })

  it('respects prefers-reduced-motion but still routes on scroll', () => {
    mockMatchMedia(true)
    const { container } = render(<DecisionMachine config={ifElse} />)
    const root = container.querySelector('[data-widget="decision_machine"]')!
    expect(root.getAttribute('data-motion')).toBe('reduced')
    scrollDialTo(screen.getByRole('listbox', { name: 'input number' }), 9)
    expect(activeBranch(container)).toContain('if n % 3 == 0:')
  })
})
