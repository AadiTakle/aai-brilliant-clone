import { useState } from 'react'

/**
 * Whether the user has asked the OS to reduce motion. Safe in SSR/test (no
 * matchMedia) — defaults to "do animate". Centralizes the check that used to be
 * copy-pasted across every widget.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Reads the preference once on mount (animations are decided up front). */
export function useReducedMotion(): boolean {
  const [reduced] = useState(prefersReducedMotion)
  return reduced
}

/** The `data-motion` attribute value widgets use to gate CSS animations. */
export function motionAttr(reduced: boolean): 'reduced' | 'full' {
  return reduced ? 'reduced' : 'full'
}
