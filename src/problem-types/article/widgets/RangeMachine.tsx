import { useEffect, useMemo, useState } from 'react'
import { rangeMachineConfigSchema } from '../schema'
import { NumberWheel } from './NumberWheel'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Does the user prefer reduced motion? When true we skip the collapse pulse and
// the number "pop" so nothing animates. Guarded for non-browser test envs.
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// The number-wheel range builder / collapse demo. The learner scrolls to pick a
// value for `n`, then STEPS the `range(...)` expression as it collapses to a
// concrete list of numbers. The whole point is that the argument becomes a
// single value BEFORE the loop ever runs:
//   range(1, n + 1)  →  range(1, 5 + 1)  →  range(1, 6)  →  1, 2, 3, 4, 5
// In the simple form (`plusOne: false`) it instead shows range(n) → 0..n-1,
// reinforcing that range stops just BEFORE n. Built on the shared NumberWheel.
export function RangeMachine({ config, onComplete }: Props) {
  const cfg = useMemo(() => rangeMachineConfigSchema.parse(config), [config])
  const [reduced] = useState(prefersReducedMotion)

  const [n, setN] = useState(() => clamp(cfg.initial, 0, cfg.max))
  // Phase walks the collapse one move at a time. The expand phase is the last.
  // simple form:    0 expression → 1 substitute → 2 expand
  // expression form:0 expression → 1 substitute → 2 compute → 3 expand
  const expandPhase = cfg.plusOne ? 3 : 2
  const [phase, setPhase] = useState(0)

  const stop = cfg.plusOne ? n + 1 : n
  const produced = useMemo(() => {
    const out: number[] = []
    for (let i = cfg.start; i < stop; i++) out.push(i)
    return out
  }, [cfg.start, stop])

  const atExpand = phase >= expandPhase

  useEffect(() => {
    if (atExpand) onComplete?.()
  }, [atExpand, onComplete])

  // Scrolling/tapping the wheel to a new value re-arms the demo from the top.
  function pickN(value: number) {
    const next = clamp(value, 0, cfg.max)
    setN(next)
    setPhase(0)
  }

  // The text of the range call at the current phase. The leading `range(` and
  // trailing `)` are constant; only the stop argument changes as it collapses.
  const callText = useMemo(() => {
    const sym = cfg.plusOne ? 'n + 1' : 'n'
    const substituted = cfg.plusOne ? `${n} + 1` : `${n}`
    const computed = `${stop}`

    let stopArg: string
    if (phase === 0) stopArg = sym
    else if (phase === 1) stopArg = substituted
    else stopArg = computed // compute + expand phases show the single value

    if (cfg.start === 0 && !cfg.plusOne) return `range(${stopArg})`
    return `range(${cfg.start}, ${stopArg})`
  }, [cfg.start, cfg.plusOne, n, stop, phase])

  const commentary = useMemo(() => {
    if (cfg.plusOne) {
      switch (phase) {
        case 0:
          return `Before the loop runs, Python has to work out range(${cfg.start}, n + 1). Right now n is just a name — no numbers yet.`
        case 1:
          return `First it swaps n for its value: n is ${n}, so n + 1 turns into ${n} + 1.`
        case 2:
          return `Then it does the math: ${n} + 1 is ${stop}. The expression has become a single value, ${stop}, before the loop even starts.`
        default:
          return `Now range(${cfg.start}, ${stop}) hands the loop these numbers, one per turn — and it stops just before ${stop}.`
      }
    }
    switch (phase) {
      case 0:
        return `Before the loop runs, Python works out range(n). Right now n is just a name.`
      case 1:
        return `n is ${n}, so this becomes range(${n}).`
      default:
        return `range(${n}) gives the numbers from ${cfg.start} up to — but NOT including — ${n}. It stops just before ${n}.`
    }
  }, [cfg.plusOne, cfg.start, n, stop, phase])

  return (
    <div
      className="widget widget-range-machine"
      data-widget="range_machine"
      data-motion={reduced ? 'reduced' : 'full'}
      data-phase={phase}
    >
      <div className="rm-stage">
        <div className="rm-wheel-area">
          <span className="rm-wheel-label">n</span>
          <NumberWheel
            max={cfg.max}
            selected={n}
            onSelect={pickN}
            reduced={reduced}
            ariaLabel="choose n"
          />
        </div>

        <div className="rm-machine">
          <p className="rm-call" aria-label="range expression" aria-live="polite">
            <code key={`${n}-${phase}`} className="rm-call-code">
              {callText}
            </code>
          </p>

          <div className="rm-arrow" aria-hidden="true">
            ↓
          </div>

          <div className="rm-list" aria-label="produced numbers" aria-live="polite">
            {atExpand
              ? produced.map((value, i) => (
                  <span key={value} className="rm-num" style={{ animationDelay: reduced ? undefined : `${i * 90}ms` }}>
                    {value}
                  </span>
                ))
              : null}
          </div>
        </div>
      </div>

      <p className="rm-commentary" aria-label="commentary" aria-live="polite">
        {commentary}
      </p>

      <div className="rm-controls">
        <button type="button" onClick={() => setPhase((p) => Math.min(p + 1, expandPhase))} disabled={atExpand}>
          Step
        </button>
        <button type="button" className="ghost" onClick={() => setPhase(0)} disabled={phase === 0}>
          Restart
        </button>
        <span className="rm-progress">
          step {Math.min(phase + 1, expandPhase + 1)} / {expandPhase + 1}
        </span>
      </div>

      {cfg.caption && <p className="widget-caption">{cfg.caption}</p>}
    </div>
  )
}
