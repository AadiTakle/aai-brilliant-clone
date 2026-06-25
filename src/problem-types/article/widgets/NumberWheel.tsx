import { useEffect, useRef } from 'react'

// Fixed height (px) of every number slot in the wheel. Selection is derived from
// scroll position: the slot whose centre lines up with the wheel's centre band is
// the selected one, so `round(scrollTop / ITEM_HEIGHT)` is the selected index.
// The wheel's top/bottom padding (see App.css) equals (wheelHeight - ITEM_HEIGHT)/2,
// which makes that mapping independent of the wheel's own height. Exported so the
// tests can drive scrolling without magic numbers.
export const NUMBER_WHEEL_ITEM_HEIGHT = 40

// The mouse wheel advances at most one number per this many milliseconds, so a
// notch (or a trackpad swipe) steps cleanly one value at a time instead of
// skating across several and landing between numbers.
const WHEEL_STEP_COOLDOWN_MS = 90

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

interface NumberWheelProps {
  // The wheel shows every integer 0..max.
  max: number
  // The currently centred (selected) number.
  selected: number
  // Called whenever a different number reaches the centre band (by scroll or tap).
  onSelect: (n: number) => void
  // When true, taps snap into place instead of smooth-scrolling.
  reduced: boolean
  // Accessible name for the wheel itself (e.g. "left number").
  ariaLabel: string
}

// An iPhone-alarm-style scrollable number picker, shared by the ModuloPicker,
// ComparisonExplorer, RangeMachine and DecisionMachine widgets. Whichever number
// is scrolled to the CENTRE of the wheel is the selected one — there is no extra
// click-to-confirm step. Three ways to move it, all of which SNAP to a whole
// number (never between two):
//   • drag it up/down with the mouse,
//   • the mouse wheel, one number per notch,
//   • tapping a number scrolls it to the centre.
// Respects prefers-reduced-motion. The wheel is purely presentational; the owning
// widget keeps the selected-number state.
export function NumberWheel({ max, selected, onSelect, reduced, ariaLabel }: NumberWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  // Mouse drag-to-scroll bookkeeping (mouse only — touch/trackpad scroll natively).
  const drag = useRef<{ startY: number; startTop: number; moved: boolean; pointerId: number } | null>(null)
  // After a real drag, swallow the click the browser fires so it does not re-pick.
  const justDragged = useRef(false)
  // Throttles the mouse wheel so each notch is one clean step.
  const lastWheelStep = useRef(0)
  // Debounce handle for snapping a native (touch) scroll onto a whole number
  // once it stops moving — mouse wheel / drag / tap already snap explicitly.
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The last COMMITTED whole-number index. The wheel steps from this, never from
  // a mid-animation scrollTop — reading scrollTop while a smooth scroll is still
  // gliding rounds to a half-step and makes the dial jump two (it "skips" a
  // number). Kept in sync with the live scroll position and the prop below.
  const indexRef = useRef(clamp(selected, 0, max))

  // Keep the committed index aligned with the owner's state (e.g. external resets)
  // when we are not mid-drag.
  useEffect(() => {
    if (!drag.current) indexRef.current = clamp(selected, 0, max)
  }, [selected, max])

  // The scrollTop that puts item `i` exactly on the centre band, measured from the
  // real laid-out geometry so the wheel's border/padding can't push the selected
  // number off-centre (the CSS border shrinks the scrollport by a couple of px, so
  // the simple i*ITEM_HEIGHT formula lands every number slightly low). Falls back
  // to the arithmetic mapping when geometry is unavailable (jsdom / before paint).
  function topForIndex(i: number): number {
    const wheel = wheelRef.current
    const item = wheel?.children[i] as HTMLElement | undefined
    if (!wheel || !item || !item.offsetHeight) return i * NUMBER_WHEEL_ITEM_HEIGHT
    return item.offsetTop - (wheel.clientHeight - item.offsetHeight) / 2
  }

  // The real, on-screen row spacing. This is normally NUMBER_WHEEL_ITEM_HEIGHT,
  // but on mobile the browser may auto-inflate text (text-size-adjust), growing
  // each row past 40px. Measuring it keeps selection in lock-step with
  // topForIndex; using the hardcoded 40 instead makes the rounding overshoot
  // once the mismatch passes half a row, so the dial "runs away" downward.
  function rowStep(): number {
    const wheel = wheelRef.current
    const a = wheel?.children[0] as HTMLElement | undefined
    const b = wheel?.children[1] as HTMLElement | undefined
    if (a && b && b.offsetTop > a.offsetTop) return b.offsetTop - a.offsetTop
    if (a && a.offsetHeight) return a.offsetHeight
    return NUMBER_WHEEL_ITEM_HEIGHT
  }

  // Which number's centre is nearest the centre band for a given scrollTop, again
  // from real geometry (inverse of topForIndex). Falls back to the arithmetic
  // mapping when geometry is unavailable.
  function indexFromScroll(top: number): number {
    const wheel = wheelRef.current
    const first = wheel?.children[0] as HTMLElement | undefined
    if (!wheel || !first || !first.offsetHeight) {
      return clamp(Math.round(top / NUMBER_WHEEL_ITEM_HEIGHT), 0, max)
    }
    const center = top + wheel.clientHeight / 2
    const firstCenter = first.offsetTop + first.offsetHeight / 2
    return clamp(Math.round((center - firstCenter) / rowStep()), 0, max)
  }

  // On mount, scroll the dial so its initial `selected` value sits on the centre
  // band. Without this the wheel rests at scrollTop 0 and shows 0 even when the
  // owning widget started it at another value (e.g. ComparisonExplorer's 3 / 5).
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    const wheel = wheelRef.current
    if (!wheel) return
    didInit.current = true
    const top = topForIndex(clamp(selected, 0, max))
    if (typeof wheel.scrollTo === 'function') wheel.scrollTo({ top, behavior: 'auto' })
    else wheel.scrollTop = top
    // Run once after first paint; later external changes are handled elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The number currently at the centre band, read from the live scroll position.
  function currentIndex(): number {
    const wheel = wheelRef.current
    if (!wheel) return clamp(selected, 0, max)
    return indexFromScroll(wheel.scrollTop)
  }

  // The wheel scrolled: the centred slot is round(scrollTop / itemHeight). For
  // native (touch) scrolls — which have no explicit release snap — settle onto an
  // exact number once movement stops so the dial never rests between two.
  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const index = indexFromScroll(e.currentTarget.scrollTop)
    indexRef.current = index
    onSelect(index)
    if (drag.current) return
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const wheel = wheelRef.current
      if (!wheel || drag.current) return
      const idx = indexFromScroll(wheel.scrollTop)
      const top = topForIndex(idx)
      if (Math.abs(wheel.scrollTop - top) > 1 && typeof wheel.scrollTo === 'function') {
        wheel.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
      }
    }, 140)
  }

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
  }, [])

  // Scroll a number to the centre (which then drives selection). We also select
  // immediately so keyboard/click works even where smooth scrolling is a no-op
  // (e.g. tests / jsdom). Pass smooth=false to land instantly (used by the wheel
  // so each notch settles on an exact number before the next one is read).
  function scrollToNumber(n: number, smooth = !reduced) {
    const value = clamp(n, 0, max)
    indexRef.current = value
    const top = topForIndex(value)
    const wheel = wheelRef.current
    if (wheel) {
      if (typeof wheel.scrollTo === 'function') {
        wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
      } else {
        wheel.scrollTop = top
      }
    }
    onSelect(value)
  }

  // Mouse wheel → step exactly one number per notch, from the committed index and
  // landing instantly. We attach a NON-passive listener so we can preventDefault
  // and stop the native (fractional, twitchy) scroll from also moving the dial.
  useEffect(() => {
    const wheel = wheelRef.current
    if (!wheel) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const now = e.timeStamp || Date.now()
      if (now - lastWheelStep.current < WHEEL_STEP_COOLDOWN_MS) return
      lastWheelStep.current = now
      scrollToNumber(indexRef.current + (e.deltaY > 0 ? 1 : -1), false)
    }
    wheel.addEventListener('wheel', onWheel, { passive: false })
    return () => wheel.removeEventListener('wheel', onWheel)
    // scrollToNumber reads refs + these props; re-bind when they change.
  }, [max, reduced, onSelect])

  // Mouse drag-to-scroll: grab the dial and slide it up/down. Touch and trackpad
  // already scroll natively, so we only take over for the mouse.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') return
    const wheel = wheelRef.current
    if (!wheel) return
    drag.current = { startY: e.clientY, startTop: wheel.scrollTop, moved: false, pointerId: e.pointerId }
    wheel.setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    const wheel = wheelRef.current
    if (!d || !wheel) return
    e.preventDefault()
    const dy = e.clientY - d.startY
    if (Math.abs(dy) > 3) d.moved = true
    // Drag down → reveal earlier numbers (scroll up), like a real wheel.
    wheel.scrollTop = d.startTop - dy
  }

  function endDrag() {
    const d = drag.current
    const wheel = wheelRef.current
    if (!d || !wheel) return
    drag.current = null
    wheel.releasePointerCapture?.(d.pointerId)
    if (d.moved) {
      justDragged.current = true
      // Snap to whichever number we let go nearest to.
      scrollToNumber(currentIndex())
    }
  }

  function onNumberClick(n: number) {
    if (justDragged.current) {
      justDragged.current = false
      return
    }
    scrollToNumber(n)
  }

  const numbers = Array.from({ length: max + 1 }, (_, i) => i)

  return (
    <div
      className="mpk-wheel"
      ref={wheelRef}
      aria-label={ariaLabel}
      role="listbox"
      data-motion={reduced ? 'reduced' : 'full'}
      onScroll={handleScroll}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {numbers.map((n) => (
        <button
          key={n}
          type="button"
          data-value={n}
          role="option"
          className={`mpk-num${selected === n ? ' is-selected' : ''}`}
          aria-label={`select ${n}`}
          aria-selected={selected === n}
          onClick={() => onNumberClick(n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
