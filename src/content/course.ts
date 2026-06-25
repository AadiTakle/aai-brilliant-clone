// UI-only presentation metadata for the course + its lessons. Kept separate from
// the validated content model (src/content/schemas.ts) so the course can have a
// name, description, and per-lesson blurbs/icons without churning lesson schemas
// or the curriculum coverage tests. Keyed by lesson id; order comes from the
// lesson catalog (src/content/lessons/index.ts).

export interface LessonMeta {
  /** Short label for the station node (the full title can be long). */
  shortTitle: string
  /** One-sentence, kid-facing description of what they'll do. */
  blurb: string
  /** Decorative glyph for the station (rendered aria-hidden). */
  icon: string
}

export interface CourseMeta {
  id: string
  name: string
  tagline: string
  description: string
}

export const course: CourseMeta = {
  id: 'python-basics',
  name: 'Python Basics',
  tagline: 'Learn to code from zero, one machine at a time.',
  description:
    'Nine hands-on lessons take you from your very first line of code to writing a real program all by yourself. No experience needed — you build, run, and see it work every step of the way.',
}

// One entry per lesson id. The final lesson is the "boss level" finale.
export const lessonMeta: Record<string, LessonMeta> = {
  'l1-talking-to-the-computer': {
    shortTitle: 'Talking to the Computer',
    blurb: 'Make the computer say your words out loud with print().',
    icon: '\u{1F4AC}',
  },
  'l2-boxes-that-remember': {
    shortTitle: 'Boxes that Remember',
    blurb: 'Store a value in a labeled box and use it later.',
    icon: '\u{1F4E6}',
  },
  'l3-doing-the-math': {
    shortTitle: 'Doing the Math',
    blurb: 'Add, multiply, and find remainders — the math behind code.',
    icon: '\u{1F9EE}',
  },
  'l4-true-or-false': {
    shortTitle: 'True or False',
    blurb: 'Ask yes/no questions and let the computer answer them.',
    icon: '\u{2696}\u{FE0F}',
  },
  'l5-making-decisions': {
    shortTitle: 'Making Decisions',
    blurb: 'Teach your program to choose what to do with if and else.',
    icon: '\u{1F500}',
  },
  'l6-over-and-over-again': {
    shortTitle: 'Over and Over Again',
    blurb: 'Use a loop to repeat work without typing it out every time.',
    icon: '\u{1F501}',
  },
  'l7-loops-and-decisions': {
    shortTitle: 'Loops and Decisions',
    blurb: 'Combine loops and choices to decide something for each number.',
    icon: '\u{1F504}',
  },
  'l8-build-your-own-machine': {
    shortTitle: 'Build Your Own Machine',
    blurb: 'Make your own function — a machine you build and reuse.',
    icon: '\u{1F527}',
  },
  'l9-fizzbuzzpop': {
    shortTitle: 'FizzBuzzPop',
    blurb: 'The finale: write the whole program from a blank screen.',
    icon: '\u{1F3C6}',
  },
}

/** Presentation metadata for a lesson, with a safe fallback. */
export function getLessonMeta(lessonId: string, fallbackTitle: string): LessonMeta {
  return (
    lessonMeta[lessonId] ?? {
      shortTitle: fallbackTitle,
      blurb: '',
      icon: '\u{1F4D8}',
    }
  )
}
