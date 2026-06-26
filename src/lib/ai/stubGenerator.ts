// A deterministic, offline stand-in for the real OpenAI generator. It lets the
// entire custom-lesson UX (generate -> validate -> self-test -> spend -> play)
// be exercised without an API key or Blaze. It mimics the two real outcomes:
//   - a structured refusal for clearly out-of-scope / too-big requests, and
//   - an accepted, schema-valid mini lesson for in-scope concepts.
//
// Swap to the real generator by setting VITE_AI_BACKEND=callable (see generator.ts).

import type { AiGenerator, RawGenerationResult } from './types'

// Concepts well outside a beginner Python-from-scratch course. The real model is
// instructed to refuse these too; the stub approximates it with keywords.
const OUT_OF_SCOPE = [
  'app',
  'website',
  'web site',
  'game',
  'machine learning',
  'neural',
  'ai model',
  'database',
  'api',
  '3d',
  'mobile',
  'deploy',
  'server',
  'blockchain',
]

function buildMiniLesson(topic: string): unknown {
  const clean = topic.trim().replace(/\s+/g, ' ').slice(0, 60)
  return {
    id: 'pending', // overwritten with the Firestore doc id on save
    title: `Mini Lesson: ${clean}`,
    version: 1,
    steps: [
      {
        id: 'intro',
        type: 'article',
        title: 'The idea',
        graded: false,
        config: {
          panels: [
            {
              text: `This is a short, AI-made practice lesson about **${clean}**. Read the idea, then try it yourself on the next step. (This is a stub preview \u2014 connect the OpenAI backend to get real, tailored lessons.)`,
            },
            {
              text: 'Quick check:',
              activity: {
                kind: 'checkpoint',
                prompt: 'Practice lessons like this one are best used to...',
                choices: ['Try the idea yourself', 'Skip straight to the end', 'Only read, never type'],
                answerIndex: 0,
                feedback: {
                  correct: 'Exactly \u2014 the point is to try it hands-on.',
                  incorrect: 'Think about what makes practice stick: is it reading, or doing?',
                },
              },
            },
          ],
        },
      },
      {
        id: 'practice',
        type: 'python_sandbox',
        title: 'Try it',
        graded: true,
        config: {
          prompt: 'Warm up by printing the word READY (exactly), then press Run.',
          starterCode: '# Print the word READY\n',
          lenient: true,
          successMessage: 'Nice \u2014 you ran a real program in your custom lesson!',
          testCases: [
            {
              stdin: '',
              expectedStdout: 'READY',
              feedback: 'Almost \u2014 print a single line that says READY.',
            },
          ],
        },
      },
    ],
  }
}

export const stubGenerator: AiGenerator = {
  async generate({ prompt }): Promise<RawGenerationResult> {
    const text = prompt.trim()
    if (text.length === 0) {
      return { accepted: false, reason: 'Please describe a concept you want to learn.' }
    }
    if (text.length > 200) {
      return {
        accepted: false,
        reason:
          'That request is a bit big for one lesson. Try narrowing it to a single beginner Python idea (for example, "how the % remainder works").',
      }
    }
    const lower = text.toLowerCase()
    const hit = OUT_OF_SCOPE.find((kw) => lower.includes(kw))
    if (hit) {
      return {
        accepted: false,
        reason: `Building a "${hit}" is outside what these short practice lessons cover. Ask for a single beginner Python concept instead \u2014 like variables, loops, or comparing numbers.`,
      }
    }
    return { accepted: true, lesson: buildMiniLesson(text) }
  },
}
