import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import OpenAI from 'openai'
import { MAX_STEPS, buildRepairUserMessage, buildSystemPrompt, buildResponseSchema } from './lessonSpec.js'

initializeApp()

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY')
const MODEL = 'gpt-4o-mini'
const CUSTOM_LESSON_COST = 500

interface GenerateData {
  prompt?: string
  repair?: { lesson?: unknown; errors?: unknown }
  widgetMode?: 'standard' | 'simple'
}

// Stateless generation: produce lesson JSON (or a refusal). Charges nothing — the
// client validates + self-tests the result, then calls commitCustomLesson to pay.
export const generateCustomLesson = onCall(
  { secrets: [OPENAI_API_KEY], enforceAppCheck: true },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to create a lesson.')
    }
    const prompt = String((req.data as GenerateData)?.prompt ?? '').trim()
    if (!prompt) {
      throw new HttpsError('invalid-argument', 'Describe a concept to learn.')
    }
    if (prompt.length > 400) {
      return {
        accepted: false,
        reason: 'That request is too long. Try a single, short beginner Python idea.',
      }
    }

    const widgetMode = (req.data as GenerateData)?.widgetMode === 'simple' ? 'simple' : 'standard'

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: buildSystemPrompt(widgetMode) },
      { role: 'user', content: prompt },
    ]
    // Auto-repair pass: replay the prior (rejected) lesson and the exact errors
    // so the model fixes only what failed validation, instead of regenerating
    // from scratch.
    const repair = (req.data as GenerateData)?.repair
    const repairErrors = Array.isArray(repair?.errors)
      ? (repair.errors as unknown[]).filter((e): e is string => typeof e === 'string')
      : []
    if (repair?.lesson && repairErrors.length > 0) {
      messages.push({
        role: 'assistant',
        content: JSON.stringify({ accepted: true, lesson: repair.lesson }),
      })
      messages.push({
        role: 'user',
        content: buildRepairUserMessage(repairErrors),
      })
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() })
    let completion
    try {
      completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'lesson_or_refusal',
            strict: false,
            schema: buildResponseSchema(widgetMode),
          },
        },
      })
    } catch (e) {
      // Turn raw OpenAI failures into clear, friendly callable errors so the UI
      // can tell the learner what actually happened instead of a generic crash.
      const err = e as { status?: number; code?: string }
      if (err?.code === 'insufficient_quota') {
        throw new HttpsError(
          'resource-exhausted',
          'The lesson generator is unavailable right now (the AI account is out of credit). Please try again later.',
        )
      }
      if (err?.status === 429) {
        throw new HttpsError(
          'resource-exhausted',
          'The lesson generator is busy right now. Please wait a moment and try again.',
        )
      }
      throw new HttpsError(
        'unavailable',
        'The lesson generator could not reach the AI service. Please try again.',
      )
    }

    const finishReason = completion.choices[0]?.finish_reason
    if (finishReason === 'length') {
      return {
        accepted: false,
        reason:
          'That topic produced a lesson too long to finish generating. Try a more specific slice of it.',
      }
    }

    const text = completion.choices[0]?.message?.content ?? '{"accepted":false,"reason":"empty"}'
    try {
      return JSON.parse(text)
    } catch {
      throw new HttpsError(
        'internal',
        'The AI returned a lesson we could not read. Please try again.',
      )
    }
  },
)

interface CommitData {
  lessonJson?: string
  prompt?: string
  simplifiedWidgets?: boolean
}

// Atomically spends Sparks and persists the (client-validated) lesson under
// users/{uid}/aiLessons. Re-checks shape + affordability server-side so the
// balance can never go negative regardless of client behavior.
export const commitCustomLesson = onCall({ enforceAppCheck: true }, async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to save a lesson.')
  }
  const uid = req.auth.uid
  const data = req.data as CommitData
  const lessonJson = String(data?.lessonJson ?? '')
  const prompt = String(data?.prompt ?? '')

  let lesson: { title?: unknown; steps?: unknown }
  try {
    lesson = JSON.parse(lessonJson)
  } catch {
    throw new HttpsError('invalid-argument', 'Lesson JSON is malformed.')
  }
  if (typeof lesson.title !== 'string' || !Array.isArray(lesson.steps)) {
    throw new HttpsError('invalid-argument', 'Lesson is missing a title or steps.')
  }
  if (lesson.steps.length < 1 || lesson.steps.length > MAX_STEPS) {
    throw new HttpsError('invalid-argument', `Lessons must have 1-${MAX_STEPS} steps.`)
  }

  const db = getFirestore()
  const userRef = db.doc(`users/${uid}`)
  const lessonRef = db.collection(`users/${uid}/aiLessons`).doc()
  const id = lessonRef.id
  const lessonWithId = { ...(lesson as object), id }
  const simplifiedWidgets = Boolean((data as CommitData)?.simplifiedWidgets)
  const record = {
    id,
    title: lesson.title,
    prompt,
    cost: CUSTOM_LESSON_COST,
    createdAt: new Date().toISOString(),
    lessonJson: JSON.stringify(lessonWithId),
    ...(simplifiedWidgets ? { simplifiedWidgets: true } : {}),
  }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef)
    const total = (snap.data()?.totalPoints ?? 0) as number
    if (total < CUSTOM_LESSON_COST) {
      throw new HttpsError('failed-precondition', 'NOT_ENOUGH_SPARKS')
    }
    tx.update(userRef, { totalPoints: total - CUSTOM_LESSON_COST })
    tx.set(lessonRef, record)
  })

  return record
})
