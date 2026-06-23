import { overAndOverAgain } from './over-and-over-again'

// The raw (unvalidated) lesson catalog, keyed by lesson id. The loader and the
// validate-content script are the only places that should read this directly.
export const rawLessons: Record<string, unknown> = {
  [overAndOverAgain.id]: overAndOverAgain,
}
