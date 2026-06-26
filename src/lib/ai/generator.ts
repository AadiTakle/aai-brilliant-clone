// Picks the active generator. Defaults to the offline stub so the feature is
// fully testable today; set VITE_AI_BACKEND=callable to route generation through
// the deployed Firebase Callable Function (which holds the OpenAI key server-side).

import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'
import type { AiGenerator, CustomLessonRequest, RawGenerationResult } from './types'
import { stubGenerator } from './stubGenerator'

const callableGenerator: AiGenerator = {
  async generate(req) {
    const fn = httpsCallable<CustomLessonRequest, RawGenerationResult>(
      functions,
      'generateCustomLesson',
    )
    const res = await fn(req)
    return res.data
  },
}

export function getGenerator(): AiGenerator {
  const backend = import.meta.env.VITE_AI_BACKEND
  return backend === 'callable' ? callableGenerator : stubGenerator
}
