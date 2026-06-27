import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import OpenAI from 'openai'
import { buildRepairUserMessage, buildSystemPrompt, buildResponseSchema } from './lessonSpec.js'
import {
  MASTERY_SYSTEM_PROMPT,
  buildMasteryUserMessage,
  buildMasteryResponseSchema,
} from './masterySpec.js'
import { validateLessonStructure, MAX_LESSON_JSON_BYTES } from './validateLesson.js'
import { BUILTIN_LESSON_META } from './builtinLessonMeta.js'
import { BUILTIN_CHECKPOINT_META, awardCheckpoint } from './checkpointMeta.js'
import {
  awardStep,
  awardMastery,
  updateStreak,
  emptyLedger,
  type RewardLedger,
  type StreakState,
} from './rewards.js'
import {
  emptyConcept,
  updateConcept,
  dailyAward,
  MAX_DAILY_RESULTS,
  type ConceptMastery,
  type DailyResult,
} from './dailySchedule.js'

initializeApp()

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY')
const MODEL = 'gpt-4o-mini'
const CUSTOM_LESSON_COST = 500

// Abuse controls for the (unpaid) generation endpoint. Generation costs real
// OpenAI tokens, so an authenticated caller hitting the callable directly must
// be bounded even though no Sparks are charged until commit.
const MAX_GENERATIONS_PER_DAY = 40
const MIN_GENERATION_INTERVAL_MS = 4_000
// A repair pass replays the prior lesson; cap it so a caller can't inflate token
// usage with a giant payload.
const MAX_REPAIR_LESSON_BYTES = 100_000

interface GenerateData {
  prompt?: string
  repair?: { lesson?: unknown; errors?: unknown }
  widgetMode?: 'standard' | 'simple'
}

/**
 * Per-user rate limit for lesson generation, enforced in a transaction on a
 * server-only doc (aiUsage/{uid}, not writable by clients). Throttles bursts and
 * caps total daily generations so a single account can't drain OpenAI quota.
 * Throws HttpsError('resource-exhausted', ...) when a limit is hit.
 */
async function enforceGenerationRateLimit(uid: string): Promise<void> {
  const db = getFirestore()
  const ref = db.doc(`aiUsage/${uid}`)
  const now = Date.now()
  const today = new Date(now).toISOString().slice(0, 10) // UTC YYYY-MM-DD
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data() ?? {}
    const sameDay = data.day === today
    const count = sameDay ? ((data.count as number) ?? 0) : 0
    const lastAt = (data.lastAt as number) ?? 0

    if (now - lastAt < MIN_GENERATION_INTERVAL_MS) {
      throw new HttpsError(
        'resource-exhausted',
        'You are creating lessons too quickly. Please wait a moment and try again.',
      )
    }
    if (count >= MAX_GENERATIONS_PER_DAY) {
      throw new HttpsError(
        'resource-exhausted',
        'You have reached the daily limit for creating lessons. Please try again tomorrow.',
      )
    }
    tx.set(ref, { day: today, count: count + 1, lastAt: now, updatedAt: FieldValue.serverTimestamp() })
  })
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

    // Throttle + daily cap per user before spending any OpenAI tokens.
    await enforceGenerationRateLimit(req.auth.uid)

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
      const repairLessonJson = JSON.stringify({ accepted: true, lesson: repair.lesson })
      if (repairLessonJson.length > MAX_REPAIR_LESSON_BYTES) {
        throw new HttpsError('invalid-argument', 'The lesson to repair is too large.')
      }
      messages.push({
        role: 'assistant',
        content: repairLessonJson,
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

interface MasteryGenData {
  lessonId?: string
  struggledConcepts?: unknown
  count?: unknown
}

// Stateless generation of a lesson's Mastery Challenge "Apply" questions, weighted
// toward the concepts the learner just struggled with. Charges nothing — the
// client validates each python_sandbox shape AND self-tests the model's reference
// solution in Pyodide, falling back to the lesson's authored static Apply on any
// failure. Mirrors generateCustomLesson's auth/App Check/rate-limit/error model.
export const generateMasteryQuestions = onCall(
  { secrets: [OPENAI_API_KEY], enforceAppCheck: true },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to take the mastery challenge.')
    }
    const data = req.data as MasteryGenData
    const lessonId = String(data?.lessonId ?? '').trim()
    if (!lessonId || !BUILTIN_LESSON_META[lessonId]) {
      throw new HttpsError('invalid-argument', 'Unknown lesson.')
    }
    const concepts = Array.isArray(data?.struggledConcepts)
      ? (data.struggledConcepts as unknown[])
          .filter((c): c is string => typeof c === 'string')
          .slice(0, 12)
      : []
    if (concepts.length === 0) {
      throw new HttpsError('invalid-argument', 'No concepts to review.')
    }
    const countRaw = Number(data?.count ?? 1)
    const count = Number.isFinite(countRaw) ? Math.max(1, Math.min(2, Math.floor(countRaw))) : 1

    await enforceGenerationRateLimit(req.auth.uid)

    const messages: { role: 'system' | 'user'; content: string }[] = [
      { role: 'system', content: MASTERY_SYSTEM_PROMPT },
      { role: 'user', content: buildMasteryUserMessage(concepts, count) },
    ]

    const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() })
    let completion
    try {
      completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'mastery_questions',
            strict: false,
            schema: buildMasteryResponseSchema(),
          },
        },
      })
    } catch (e) {
      const err = e as { status?: number; code?: string }
      if (err?.code === 'insufficient_quota') {
        throw new HttpsError(
          'resource-exhausted',
          'The mastery challenge generator is unavailable right now (the AI account is out of credit).',
        )
      }
      if (err?.status === 429) {
        throw new HttpsError(
          'resource-exhausted',
          'The mastery challenge generator is busy right now. Please wait a moment and try again.',
        )
      }
      throw new HttpsError(
        'unavailable',
        'The mastery challenge generator could not reach the AI service. Please try again.',
      )
    }

    const finishReason = completion.choices[0]?.finish_reason
    if (finishReason === 'length') {
      return { accepted: false, reason: 'The generated questions were too long.' }
    }
    const text = completion.choices[0]?.message?.content ?? '{"accepted":false,"reason":"empty"}'
    try {
      return JSON.parse(text)
    } catch {
      throw new HttpsError(
        'internal',
        'The AI returned questions we could not read. Please try again.',
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

  if (Buffer.byteLength(lessonJson, 'utf8') > MAX_LESSON_JSON_BYTES) {
    throw new HttpsError('invalid-argument', 'Lesson is too large to save.')
  }

  let lesson: { title?: unknown; steps?: unknown }
  try {
    lesson = JSON.parse(lessonJson)
  } catch {
    throw new HttpsError('invalid-argument', 'Lesson JSON is malformed.')
  }

  // Re-run the same structural gate as the client before charging Sparks: a
  // caller hitting this callable directly must not be able to pay for — and
  // store — a malformed or ungradable lesson.
  const validation = validateLessonStructure(lesson)
  if (!validation.ok) {
    throw new HttpsError(
      'invalid-argument',
      `Lesson failed validation: ${validation.errors.slice(0, 5).join('; ')}`,
    )
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

interface RecordStepData {
  lessonId?: string
  stepId?: string
  wrongAttempts?: number
}

// Server-authoritative Spark awards. The client reports which built-in step it
// completed; the server computes the points from the bundled lesson metadata,
// records them in a server-only ledger (so a step pays out at most once), and is
// the SOLE writer of the user's balance/streak. This removes the client's ability
// to forge totalPoints. App Check is not enforced here so core gameplay keeps
// working without a reCAPTCHA key; abuse is naturally bounded because each step
// can only ever be awarded once and points come from server-side content.
export const recordStepCompletion = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to earn Sparks.')
  }
  const uid = req.auth.uid
  const data = req.data as RecordStepData
  const lessonId = String(data?.lessonId ?? '')
  const stepId = String(data?.stepId ?? '')
  const wrongAttemptsRaw = Number(data?.wrongAttempts ?? 0)
  const wrongAttempts = Number.isFinite(wrongAttemptsRaw)
    ? Math.max(0, Math.floor(wrongAttemptsRaw))
    : 0

  const meta = BUILTIN_LESSON_META[lessonId]
  // Only the built-in curriculum awards Sparks. Custom AI lessons are practice
  // only (and unknown lessons can't mint currency), so award nothing.
  if (!meta) {
    return { pointsDelta: 0, lessonComplete: false, awarded: false }
  }
  if (!meta.steps.some((s) => s.id === stepId)) {
    throw new HttpsError('invalid-argument', 'Unknown step for this lesson.')
  }

  const db = getFirestore()
  const userRef = db.doc(`users/${uid}`)
  const ledgerRef = db.doc(`rewards/${uid}_${lessonId}`)
  const today = new Date().toISOString().slice(0, 10) // server UTC day

  return await db.runTransaction(async (tx) => {
    const [userSnap, ledgerSnap] = await Promise.all([tx.get(userRef), tx.get(ledgerRef)])
    const ledger: RewardLedger = ledgerSnap.exists
      ? { awarded: (ledgerSnap.data()?.awarded as Record<string, number>) ?? {}, completed: Boolean(ledgerSnap.data()?.completed) }
      : emptyLedger()

    const outcome = awardStep(meta, ledger, stepId, wrongAttempts)
    const u = userSnap.data() ?? {}
    const currentTotal = (u.totalPoints as number) ?? 0
    const newTotal = currentTotal + outcome.pointsDelta

    const lessonComplete = ledger.completed || outcome.newlyCompleted

    // Nothing new to record (step already awarded and lesson already marked
    // complete): just report the current state.
    if (outcome.pointsDelta === 0 && !outcome.newlyCompleted) {
      return { pointsDelta: 0, lessonComplete, totalPoints: currentTotal, awarded: false }
    }

    const userUpdate: Record<string, unknown> = { totalPoints: newTotal }
    let currentStreak = (u.currentStreak as number) ?? 0

    if (outcome.newlyCompleted) {
      const streakState: StreakState = {
        currentStreak,
        lastActiveDate: (u.lastActiveDate as string | null) ?? null,
      }
      const nextStreak = updateStreak(streakState, today)
      currentStreak = nextStreak.currentStreak
      const completedLessons: string[] = Array.isArray(u.completedLessons) ? (u.completedLessons as string[]) : []
      const activeDays: string[] = Array.isArray(u.activeDays) ? (u.activeDays as string[]) : []
      userUpdate.currentStreak = nextStreak.currentStreak
      userUpdate.lastActiveDate = nextStreak.lastActiveDate
      userUpdate.completedLessons = Array.from(new Set([...completedLessons, lessonId]))
      userUpdate.activeDays = Array.from(new Set([...activeDays, today]))
    }

    tx.set(userRef, userUpdate, { merge: true })
    tx.set(ledgerRef, { uid, lessonId, awarded: outcome.awarded, completed: lessonComplete, updatedAt: FieldValue.serverTimestamp() })

    return { pointsDelta: outcome.pointsDelta, lessonComplete, totalPoints: newTotal, currentStreak, awarded: outcome.pointsDelta > 0 }
  })
})

interface MasteryCommitData {
  lessonId?: string
  correctCount?: unknown
}

// Server-authoritative Mastery Challenge completion. The client reports how many
// questions it answered correctly; the server computes the Spark award (clamped
// to the lesson's authoritative max so a client can't forge it), marks the lesson
// `mastered`, and records a one-time ledger at masteryRewards/{uid}_{lessonId} so
// the big award fires at most once. Mirrors recordStepCompletion's trust model.
export const commitMasteryCompletion = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to record mastery.')
  }
  const uid = req.auth.uid
  const data = req.data as MasteryCommitData
  const lessonId = String(data?.lessonId ?? '')
  const correctCountRaw = Number(data?.correctCount ?? 0)
  const correctCount = Number.isFinite(correctCountRaw) ? Math.max(0, Math.floor(correctCountRaw)) : 0

  const meta = BUILTIN_LESSON_META[lessonId]
  // Only the built-in curriculum has authored mastery challenges. Custom AI
  // lessons (and unknown lessons) cannot mint mastery Sparks.
  if (!meta || !meta.mastery) {
    return { sparksDelta: 0, mastered: false, awarded: false }
  }
  const masteryMeta = meta.mastery

  const db = getFirestore()
  const userRef = db.doc(`users/${uid}`)
  const ledgerRef = db.doc(`masteryRewards/${uid}_${lessonId}`)
  const today = new Date().toISOString().slice(0, 10) // server UTC day

  return await db.runTransaction(async (tx) => {
    const [userSnap, ledgerSnap] = await Promise.all([tx.get(userRef), tx.get(ledgerRef)])
    const u = userSnap.data() ?? {}
    const currentTotal = (u.totalPoints as number) ?? 0

    // Idempotent: the mastery award fires at most once per lesson.
    if (ledgerSnap.exists) {
      return {
        sparksDelta: 0,
        mastered: true,
        totalPoints: currentTotal,
        currentStreak: (u.currentStreak as number) ?? 0,
        awarded: false,
      }
    }

    const sparks = awardMastery(masteryMeta, correctCount)
    const newTotal = currentTotal + sparks

    // Mastering a lesson also completes it and counts as today's activity, so the
    // streak advances (important for L9, whose only completion signal is mastery).
    const streakState: StreakState = {
      currentStreak: (u.currentStreak as number) ?? 0,
      lastActiveDate: (u.lastActiveDate as string | null) ?? null,
    }
    const nextStreak = updateStreak(streakState, today)
    const masteredLessons: string[] = Array.isArray(u.masteredLessons) ? (u.masteredLessons as string[]) : []
    const completedLessons: string[] = Array.isArray(u.completedLessons) ? (u.completedLessons as string[]) : []
    const activeDays: string[] = Array.isArray(u.activeDays) ? (u.activeDays as string[]) : []

    const userUpdate: Record<string, unknown> = {
      totalPoints: newTotal,
      currentStreak: nextStreak.currentStreak,
      lastActiveDate: nextStreak.lastActiveDate,
      masteredLessons: Array.from(new Set([...masteredLessons, lessonId])),
      completedLessons: Array.from(new Set([...completedLessons, lessonId])),
      activeDays: Array.from(new Set([...activeDays, today])),
    }

    tx.set(userRef, userUpdate, { merge: true })
    tx.set(ledgerRef, {
      uid,
      lessonId,
      correctCount,
      sparks,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return {
      sparksDelta: sparks,
      mastered: true,
      totalPoints: newTotal,
      currentStreak: nextStreak.currentStreak,
      awarded: sparks > 0,
    }
  })
})

interface CheckpointCommitData {
  checkpointId?: string
  passed?: unknown
}

// Server-authoritative Mastery Checkpoint completion. The client reports which
// checkpoint it passed; the server pays a FLAT, one-time Spark award from the
// trusted BUILTIN_CHECKPOINT_META (the content value is not trusted), records the
// pass in passedCheckpoints (which gates the next lesson), advances the streak,
// and writes a one-time ledger at checkpointRewards/{uid}_{checkpointId} so the
// award fires at most once. Mirrors commitMasteryCompletion's trust model.
export const commitCheckpointCompletion = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to record a checkpoint.')
  }
  const uid = req.auth.uid
  const data = req.data as CheckpointCommitData
  const checkpointId = String(data?.checkpointId ?? '')
  const passed = data?.passed === true

  const meta = BUILTIN_CHECKPOINT_META[checkpointId]
  // Only known checkpoints can mint Sparks, and only on a real pass. An unknown
  // id or a non-pass writes nothing at all.
  if (!meta) {
    return { awarded: false, passed: false }
  }
  if (!passed) {
    return { awarded: false, passed: false }
  }

  const db = getFirestore()
  const userRef = db.doc(`users/${uid}`)
  const ledgerRef = db.doc(`checkpointRewards/${uid}_${checkpointId}`)
  const today = new Date().toISOString().slice(0, 10) // server UTC day

  return await db.runTransaction(async (tx) => {
    const [userSnap, ledgerSnap] = await Promise.all([tx.get(userRef), tx.get(ledgerRef)])
    const u = userSnap.data() ?? {}
    const currentTotal = (u.totalPoints as number) ?? 0

    // Idempotent: a checkpoint already in the ledger pays out at most once.
    if (ledgerSnap.exists) {
      return { awarded: false, passed: true, totalPoints: currentTotal }
    }

    const { awarded, sparks } = awardCheckpoint(meta, { passed: true, alreadyAwarded: false })
    const newTotal = currentTotal + sparks

    // Passing a checkpoint counts as today's activity, so the streak advances
    // exactly like clearing a lesson does.
    const streakState: StreakState = {
      currentStreak: (u.currentStreak as number) ?? 0,
      lastActiveDate: (u.lastActiveDate as string | null) ?? null,
    }
    const nextStreak = updateStreak(streakState, today)
    const passedCheckpoints: string[] = Array.isArray(u.passedCheckpoints) ? (u.passedCheckpoints as string[]) : []
    const activeDays: string[] = Array.isArray(u.activeDays) ? (u.activeDays as string[]) : []

    const userUpdate: Record<string, unknown> = {
      totalPoints: newTotal,
      currentStreak: nextStreak.currentStreak,
      lastActiveDate: nextStreak.lastActiveDate,
      passedCheckpoints: Array.from(new Set([...passedCheckpoints, checkpointId])),
      activeDays: Array.from(new Set([...activeDays, today])),
    }

    tx.set(userRef, userUpdate, { merge: true })
    tx.set(ledgerRef, {
      uid,
      checkpointId,
      sparks,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { awarded, passed: true, sparksDelta: sparks, totalPoints: newTotal }
  })
})

interface DailyCommitData {
  day?: unknown
  results?: unknown
}

// Server-authoritative Daily Challenge completion. The client reports the day's
// per-concept results; the server updates each concept's spaced-repetition record
// (server updateConcept — speed never lowers strength, never affects Sparks),
// grants ACCURACY-ONLY Sparks at a modest rate, advances the streak, and writes a
// one-per-day marker so the award is idempotent. Mirrors recordStepCompletion's
// trust model: App Check is not enforced so core practice keeps working, and abuse
// is bounded because each day pays out at most once.
export const commitDailyChallenge = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to do the daily challenge.')
  }
  const uid = req.auth.uid
  const data = req.data as DailyCommitData
  const day = String(data?.day ?? '')
  // The marker/day must match the local day the client schedules against, so it
  // is trusted as-is but validated to a strict YYYY-MM-DD shape.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new HttpsError('invalid-argument', 'A valid day (YYYY-MM-DD) is required.')
  }

  // Keep only well-typed entries and cap the count (anti-forge: a day's set is ~5).
  const rawResults = Array.isArray(data?.results) ? (data.results as unknown[]) : []
  const results: DailyResult[] = rawResults
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      concept: String(r.concept ?? ''),
      correct: Boolean(r.correct),
      fast: Boolean(r.fast),
    }))
    .filter((r) => r.concept.length > 0 && r.concept.length <= 40)
    .slice(0, MAX_DAILY_RESULTS)

  const db = getFirestore()
  const userRef = db.doc(`users/${uid}`)
  const dayRef = db.doc(`users/${uid}/daily/${day}`)
  const concepts = Array.from(new Set(results.map((r) => r.concept)))
  const conceptRefs = concepts.map((c) => db.doc(`users/${uid}/concepts/${c}`))

  return await db.runTransaction(async (tx) => {
    // All reads before any writes (Firestore transaction rule).
    const [userSnap, daySnap, ...conceptSnaps] = await Promise.all([
      tx.get(userRef),
      tx.get(dayRef),
      ...conceptRefs.map((ref) => tx.get(ref)),
    ])

    const u = userSnap.data() ?? {}
    const currentTotal = (u.totalPoints as number) ?? 0
    const currentStreak = (u.currentStreak as number) ?? 0

    // Idempotent: today's challenge pays out at most once.
    const award = dailyAward(daySnap.exists, results)
    if (!award.awarded) {
      return { awarded: false, sparksDelta: 0, totalPoints: currentTotal, currentStreak }
    }

    // Fold each result into its concept record (multiple results for one concept
    // apply in order), defaulting an unseen concept to emptyConcept(day).
    const conceptState = new Map<string, ConceptMastery>()
    concepts.forEach((c, i) => {
      const snap = conceptSnaps[i]
      conceptState.set(c, snap.exists ? (snap.data() as ConceptMastery) : emptyConcept(day))
    })
    for (const r of results) {
      const prev = conceptState.get(r.concept) ?? emptyConcept(day)
      conceptState.set(r.concept, updateConcept(prev, { correct: r.correct, fast: r.fast }, day))
    }
    for (const c of concepts) {
      tx.set(db.doc(`users/${uid}/concepts/${c}`), conceptState.get(c) as ConceptMastery)
    }

    const correctCount = results.filter((r) => r.correct).length
    const sparks = award.sparks // accuracy-only; `fast` deliberately ignored
    const newTotal = currentTotal + sparks

    // Daily activity advances the streak with the same grace rules, keyed on the
    // local day the challenge counts for.
    const nextStreak = updateStreak({ currentStreak, lastActiveDate: (u.lastActiveDate as string | null) ?? null }, day)
    const activeDays: string[] = Array.isArray(u.activeDays) ? (u.activeDays as string[]) : []

    tx.set(
      userRef,
      {
        totalPoints: newTotal,
        currentStreak: nextStreak.currentStreak,
        lastActiveDate: nextStreak.lastActiveDate,
        activeDays: Array.from(new Set([...activeDays, day])),
      },
      { merge: true },
    )
    tx.set(dayRef, { correctCount, sparks, updatedAt: FieldValue.serverTimestamp() })

    return { awarded: true, sparksDelta: sparks, totalPoints: newTotal, currentStreak: nextStreak.currentStreak }
  })
})
