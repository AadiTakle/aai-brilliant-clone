// Manual prompt-engineering probe for the custom AI LESSON generator.
//
// It calls OpenAI directly with the EXACT system prompt, model, and JSON schema
// that the `generateCustomLesson` Cloud Function uses, prints the raw model JSON,
// then runs the SAME trust gate the app applies: validateGeneratedLesson +
// selfTestLesson. The self-test now executes every python_sandbox's model-provided
// `referenceSolution` in Pyodide against that step's own test cases + constraints,
// so you can SEE whether each generated sandbox has correct ground truth.
//
// This is intentionally a SCRIPT, not a vitest test, so it never runs during
// `npm test` and never spends tokens unless you invoke it yourself:
//
//   OPENAI_API_KEY=sk-... npm run probe:lesson -- "how does the % remainder work"
//   OPENAI_API_KEY=sk-... npm run probe:lesson -- "add up the numbers 1 to 10 with a loop"
//   OPENAI_API_KEY=sk-... npm run probe:lesson -- "print the 7 times table from 1 to 5" --raw
//   OPENAI_API_KEY=sk-... npm run probe:lesson -- "round 3.14159 to two decimals" --loop
//
// Args:  <prompt...> [--simple] [--raw] [--loop]
//   --simple  generate with widgetMode "simple" (the restricted widget vocabulary).
//   --raw     print only the raw model JSON; skip the Pyodide ground-truth check.
//   --loop    run the FULL generateValidatedLesson self-heal loop (repair passes +
//             simple-mode fallback) and report the final outcome, instead of a
//             single shot. Use this to watch a bad sandbox get repaired.

import {
  buildRepairUserMessage,
  buildResponseSchema,
  buildSystemPrompt,
  type WidgetMode,
} from '../functions/src/lessonSpec'
import {
  extractReferenceSolutions,
  selfTestLesson,
  validateGeneratedLesson,
} from '../src/lib/ai/validate'
import { generateValidatedLesson } from '../src/lib/ai/generateLesson'
import type { AiGenerator, CustomLessonRequest, RawGenerationResult } from '../src/lib/ai/types'

// Mirror the Cloud Function (functions/src/index.ts).
const MODEL = 'gpt-4o-mini'

interface ModelResponse {
  accepted?: boolean
  reason?: string
  lesson?: unknown
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

function parseArgs(argv: string[]) {
  const words: string[] = []
  let simple = false
  let raw = false
  let loop = false
  for (const a of argv) {
    if (a === '--simple') simple = true
    else if (a === '--raw') raw = true
    else if (a === '--loop') loop = true
    else words.push(a)
  }
  return { prompt: words.join(' ').trim(), simple, raw, loop }
}

async function callOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  widgetMode: WidgetMode,
): Promise<{ parsed: ModelResponse; meta: string }> {
  const t0 = Date.now()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'lesson_or_refusal', strict: false, schema: buildResponseSchema(widgetMode) },
      },
    }),
  })
  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}:\n${await res.text()}`)
  }
  const data = (await res.json()) as {
    choices?: { finish_reason?: string; message?: { content?: string } }[]
    usage?: Record<string, number>
  }
  const choice = data.choices?.[0]
  const meta = `round-trip ${Date.now() - t0}ms · finish_reason=${choice?.finish_reason} · tokens=${JSON.stringify(data.usage ?? {})}`
  const content = choice?.message?.content ?? '{"accepted":false,"reason":"empty"}'
  return { parsed: JSON.parse(content) as ModelResponse, meta }
}

/** An OpenAI-backed generator that mirrors the callable's message construction
 *  (system prompt by widget mode, user prompt, and repair replay) so --loop runs
 *  the real self-heal pipeline. */
function makeOpenAiGenerator(apiKey: string): AiGenerator {
  return {
    async generate(req: CustomLessonRequest): Promise<RawGenerationResult> {
      const widgetMode: WidgetMode = req.widgetMode === 'simple' ? 'simple' : 'standard'
      const messages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(widgetMode) },
        { role: 'user', content: req.prompt },
      ]
      if (req.repair?.lesson && Array.isArray(req.repair.errors) && req.repair.errors.length > 0) {
        messages.push({ role: 'assistant', content: JSON.stringify({ accepted: true, lesson: req.repair.lesson }) })
        messages.push({ role: 'user', content: buildRepairUserMessage(req.repair.errors) })
      }
      const { parsed } = await callOpenAI(apiKey, messages, widgetMode)
      if (parsed.accepted && parsed.lesson !== undefined) {
        return { accepted: true, lesson: parsed.lesson }
      }
      return { accepted: false, reason: parsed.reason ?? 'refused' }
    },
  }
}

function stepSummary(lesson: { steps: { type: string; id: string }[] }): string {
  return lesson.steps.map((s) => `${s.id} (${s.type})`).join(', ')
}

async function runLoop(apiKey: string, prompt: string, simple: boolean): Promise<void> {
  console.log('--- full pipeline (generateValidatedLesson: validate + Pyodide self-test + repair/simple fallback) ---')
  console.log('(first run loads Pyodide, which can take a few seconds)\n')
  const outcome = await generateValidatedLesson(makeOpenAiGenerator(apiKey), prompt, {
    maxAttempts: simple ? 2 : 4,
    onAttempt: ({ attempt, isRepair, widgetMode }) =>
      console.log(`  attempt ${attempt}: ${isRepair ? 'repair' : 'fresh'} · widgetMode=${widgetMode}`),
  })
  console.log()
  if (outcome.kind === 'refused') {
    console.log(`Model REFUSED: ${outcome.reason}`)
  } else if (outcome.kind === 'invalid') {
    console.log('REJECTED — did not pass the trust gate after all attempts. Last errors:')
    outcome.errors.forEach((e) => console.log(`  - ${e}`))
  } else {
    console.log(`ACCEPTED ✓  ${outcome.simplifiedWidgets ? '(simplified widgets) ' : ''}`)
    console.log(`title: ${outcome.lesson.title}`)
    console.log(`steps: ${stepSummary(outcome.lesson)}`)
    console.log('\nEvery python_sandbox in this lesson has a referenceSolution that passed its own tests.')
  }
}

async function runSingleShot(apiKey: string, prompt: string, simple: boolean, raw: boolean): Promise<void> {
  const widgetMode: WidgetMode = simple ? 'simple' : 'standard'
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(widgetMode) },
    { role: 'user', content: prompt },
  ]
  const { parsed, meta } = await callOpenAI(apiKey, messages, widgetMode)
  console.log(`(${meta})\n`)
  console.log('--- raw model JSON ---')
  console.log(JSON.stringify(parsed, null, 2))
  if (raw) return

  if (!parsed.accepted || parsed.lesson === undefined) {
    console.log(`\nModel REFUSED the request: ${parsed.reason ?? '(no reason given)'}`)
    return
  }

  console.log('\n--- trust gate (validate + Pyodide self-test — same guard as the app) ---')
  console.log('(first run loads Pyodide, which can take a few seconds)\n')

  const refs = extractReferenceSolutions(parsed.lesson)
  const validated = validateGeneratedLesson(parsed.lesson)
  if (!validated.ok) {
    console.log('REJECTED at validateGeneratedLesson:')
    validated.errors.forEach((e) => console.log(`  - ${e}`))
    console.log('\nThe app would send these errors back to the model for a repair pass.')
    return
  }

  const sandboxes = validated.lesson.steps.filter((s) => s.type === 'python_sandbox')
  console.log(`validated OK · ${sandboxes.length} python_sandbox step(s) · checking ground truth...\n`)
  sandboxes.forEach((s) => {
    const ref = refs[s.id]
    console.log(`  ${s.id}: referenceSolution = ${ref ? JSON.stringify(ref) : '(MISSING)'}`)
  })

  const selfTest = await selfTestLesson(validated.lesson, undefined, refs)
  console.log()
  if (selfTest.ok) {
    console.log('ACCEPTED ✓  every sandbox reference solution passed its own test cases + constraints.')
  } else {
    console.log('REJECTED ✗  ground-truth self-test failed (the app would repair/regenerate):')
    selfTest.failures.forEach((f) => console.log(`  - ${f.stepId}: ${f.reason}`))
  }
}

async function main(): Promise<void> {
  const { prompt, simple, raw, loop } = parseArgs(process.argv.slice(2))
  if (!prompt) {
    console.error('Usage: npm run probe:lesson -- "<concept to learn>" [--simple] [--raw] [--loop]')
    process.exit(1)
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Set OPENAI_API_KEY in your environment first (it is never read from .env here).')
    process.exit(1)
  }

  console.log('=== probe: generateCustomLesson ===')
  console.log(`prompt:     ${prompt}`)
  console.log(`widgetMode: ${simple ? 'simple' : 'standard'}`)
  console.log(`mode:       ${loop ? 'full self-heal loop' : raw ? 'raw only' : 'single shot + gate'}`)
  console.log(`model:      ${MODEL}\n`)

  if (loop) await runLoop(apiKey, prompt, simple)
  else await runSingleShot(apiKey, prompt, simple, raw)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
