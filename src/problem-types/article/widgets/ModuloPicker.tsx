import { useEffect, useState } from 'react'
import { moduloPickerConfigSchema } from '../schema'
import { NUMBER_WHEEL_ITEM_HEIGHT, NumberWheel } from './NumberWheel'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Back-compat re-export: the wheel slot height now lives on the shared NumberWheel.
export const MODULO_PICKER_ITEM_HEIGHT = NUMBER_WHEEL_ITEM_HEIGHT

// Does the user prefer reduced motion? When true we skip smooth scrolling and
// snap selections into place. Guarded so it works in non-browser test envs.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// An iPhone-alarm-style scrollable number picker. There is no click-to-select
// step: whichever number is scrolled to the CENTRE of the wheel is the selected
// input, and the OUTPUT box live-updates to `input % divisor` as the centre value
// changes — so scrolling shows the remainder cycle 0,1,…,divisor-1,0 directly.
// The widget deliberately does NOT point out any pattern; the learner discovers
// it by exploring. Respects prefers-reduced-motion (instant, no smooth scroll).
// Reusable via `max` and `divisor` (L3 now, L4 later). The wheel mechanism is
// shared with ComparisonExplorer via the NumberWheel component.
export function ModuloPicker({ config, onComplete }: Props) {
  const { max, divisor, caption } = moduloPickerConfigSchema.parse(config)
  const [reduced] = useState(prefersReducedMotion)
  // The centre of the wheel starts on the first number, so 0 is selected up front.
  const [selected, setSelected] = useState(0)
  const [explored, setExplored] = useState<Set<number>>(() => new Set([0]))

  // Exploring a full cycle (divisor + 1 distinct centred inputs) is enough to
  // witness the remainder return to 0; only then is the activity complete.
  const done = explored.size >= divisor + 1

  useEffect(() => {
    if (done) onComplete?.()
  }, [done, onComplete])

  // Commit whichever number is currently centred as the selection.
  function commit(value: number) {
    setSelected(value)
    setExplored((prev) => {
      if (prev.has(value)) return prev
      const next = new Set(prev)
      next.add(value)
      return next
    })
  }

  const remainder = selected % divisor

  return (
    <div
      className="widget widget-modulo-picker"
      data-widget="modulo_picker"
      data-motion={reduced ? 'reduced' : 'full'}
    >
      <div className="mpk-stage">
        <NumberWheel
          max={max}
          selected={selected}
          onSelect={commit}
          reduced={reduced}
          ariaLabel="input number"
        />

        <div className="mpk-op" aria-hidden="true">
          % {divisor}
        </div>

        <div className="mpk-box" aria-label="remainder" aria-live="polite">
          <span className="mpk-box-label">remainder</span>
          <span className="mpk-box-value">{remainder}</span>
        </div>
      </div>

      <p className="mpk-statement" aria-live="polite">
        <code>
          {selected} % {divisor} = {remainder}
        </code>
      </p>

      {caption && <p className="widget-caption">{caption}</p>}
    </div>
  )
}
