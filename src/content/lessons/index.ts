import { l1TalkingToTheComputer } from './l1-talking-to-the-computer'
import { l2BoxesThatRemember } from './l2-boxes-that-remember'
import { l3DoingTheMath } from './l3-doing-the-math'
import { l4TrueOrFalse } from './l4-true-or-false'
import { l5MakingDecisions } from './l5-making-decisions'
import { l6OverAndOverAgain } from './l6-over-and-over-again'
import { l7LoopsAndDecisions } from './l7-loops-and-decisions'
import { l8BuildYourOwnMachine } from './l8-build-your-own-machine'
import { l9FizzBuzzPop } from './l9-fizzbuzzpop'

// The raw (unvalidated) lesson catalog, keyed by lesson id. Insertion order here
// defines the order lessons appear in the UI (the Python-from-scratch arc: output
// → variables → math → booleans → conditionals → loops → loops+ifs → functions →
// the FizzBuzzPop capstone). The loader and the validate-content script are the
// only places that should read this directly.
export const rawLessons: Record<string, unknown> = {
  [l1TalkingToTheComputer.id]: l1TalkingToTheComputer,
  [l2BoxesThatRemember.id]: l2BoxesThatRemember,
  [l3DoingTheMath.id]: l3DoingTheMath,
  [l4TrueOrFalse.id]: l4TrueOrFalse,
  [l5MakingDecisions.id]: l5MakingDecisions,
  [l6OverAndOverAgain.id]: l6OverAndOverAgain,
  [l7LoopsAndDecisions.id]: l7LoopsAndDecisions,
  [l8BuildYourOwnMachine.id]: l8BuildYourOwnMachine,
  [l9FizzBuzzPop.id]: l9FizzBuzzPop,
}
