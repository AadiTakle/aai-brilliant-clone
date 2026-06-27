// Manual prompt-engineering probe for the Mastery Challenge AI "Apply" generator.
//
// It calls OpenAI directly with the EXACT system prompt, user message, model, and
// JSON schema that the `generateMasteryQuestions` Cloud Function uses, prints the
// raw model JSON, then runs each returned question through the SAME acceptance
// check the app applies (schema parse + Pyodide self-test of the model's
// reference solution). Use it to iterate on the prompt in
// functions/src/masterySpec.ts and see exactly what comes back + whether the app
// would actually use it.
//
// This is intentionally a SCRIPT, not a vitest test, so it never runs during
// `npm test` and never spends tokens unless you invoke it yourself:
//
//   OPENAI_API_KEY=sk-... npm run probe:mastery -- l7-loops-and-decisions loop accumulator
//   OPENAI_API_KEY=sk-... npm run probe:mastery -- l3-doing-the-math modulo --count 2
//   OPENAI_API_KEY=sk-... npm run probe:mastery -- l1-talking-to-the-computer   # defaults to the lesson's whole concept pool
//
// Args:  <lessonId> [concept ...] [--count 1|2]  [--raw]
//   --raw   print only the raw model JSON; skip the Pyodide acceptance check.

import { getMasteryChallenge } from '../src/content/mastery'
import { acceptQuestion, type GeneratedApplyQuestion } from '../src/lib/mastery/acceptApply'
import {
  MASTERY_SYSTEM_PROMPT,
  buildMasteryUserMessage,
  buildMasteryResponseSchema,
} from '../functions/src/masterySpec'

// Mirror the Cloud Function (functions/src/index.ts).
const MODEL = 'gpt-4o-mini'

interface ModelResponse {
  accepted?: boolean
  reason?: string
  questions?: GeneratedApplyQuestion[]
}

function parseArgs(argv: string[]) {
  const positional: string[] = []
  let count = 1
  let raw = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--count') count = Number(argv[++i])
    else if (a === '--raw') raw = true
    else positional.push(a)
  }
  return { lessonId: positional[0], concepts: positional.slice(1), count, raw }
}

async function main(): Promise<void> {
  const { lessonId, concepts: requested, count: rawCount, raw } = parseArgs(process.argv.slice(2))

  if (!lessonId) {
    console.error('Usage: npm run probe:mastery -- <lessonId> [concept ...] [--count 1|2] [--raw]')
    process.exit(1)
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Set OPENAI_API_KEY in your environment first (it is never read from .env here).')
    process.exit(1)
  }
  const spec = getMasteryChallenge(lessonId)
  if (!spec) {
    console.error(`No mastery spec for "${lessonId}". Known lessons live in src/content/mastery/specs.ts.`)
    process.exit(1)
  }

  // Default to the lesson's whole concept pool (the "aced recall" request).
  const concepts =
    requested.length > 0
      ? requested
      : Array.from(new Set(spec.recall.map((q) => q.concept)))
  const count = Math.max(1, Math.min(2, Number.isFinite(rawCount) ? Math.floor(rawCount) : 1))

  console.log('=== probe: generateMasteryQuestions ===')
  console.log(`lesson:            ${lessonId}`)
  console.log(`struggledConcepts: ${concepts.join(', ')}`)
  console.log(`count:             ${count}`)
  console.log(`model:             ${MODEL}\n`)

  const t0 = Date.now()
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: MASTERY_SYSTEM_PROMPT },
        { role: 'user', content: buildMasteryUserMessage(concepts, count) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'mastery_questions', strict: false, schema: buildMasteryResponseSchema() },
      },
    }),
  })

  if (!res.ok) {
    console.error(`OpenAI HTTP ${res.status}:\n${await res.text()}`)
    process.exit(1)
  }

  const data = (await res.json()) as {
    choices?: { finish_reason?: string; message?: { content?: string } }[]
    usage?: Record<string, number>
  }
  const choice = data.choices?.[0]
  console.log(`(round-trip ${Date.now() - t0}ms · finish_reason=${choice?.finish_reason} · tokens=${JSON.stringify(data.usage ?? {})})\n`)

  const content = choice?.message?.content ?? ''
  let parsed: ModelResponse
  try {
    parsed = JSON.parse(content) as ModelResponse
  } catch {
    console.error('--- model returned non-JSON ---')
    console.error(content)
    process.exit(1)
  }

  console.log('--- raw model JSON ---')
  console.log(JSON.stringify(parsed, null, 2))

  if (raw) return

  if (!parsed.accepted) {
    console.log(`\nModel REFUSED the request: ${parsed.reason ?? '(no reason given)'}`)
    return
  }

  console.log('\n--- acceptance check (schema + Pyodide self-test — same guard as the app) ---')
  console.log('(first run loads Pyodide, which can take a few seconds)\n')
  const questions = parsed.questions ?? []
  let accepted = 0
  for (let i = 0; i < questions.length; i++) {
    const result = await acceptQuestion(questions[i])
    if (result.ok) {
      accepted++
      console.log(`Q${i + 1}: ACCEPTED  ✓`)
    } else {
      console.log(`Q${i + 1}: REJECTED  ✗  — ${result.reason}`)
    }
  }
  console.log(
    `\n${accepted}/${questions.length} question(s) would be used.` +
      (accepted === 0 ? ' The app would FALL BACK to the lesson\u2019s static Apply.' : ''),
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
