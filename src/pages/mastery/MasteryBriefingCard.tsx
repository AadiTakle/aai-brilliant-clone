import { Link } from 'react-router-dom'
import type { MasteryChallengeSpec } from '../../content/mastery'

// The briefing card: same visual language as a lesson problem card. Explains what
// the challenge covers, nudges a light review (optionally via an AI lesson), and
// gates the start.
export function MasteryBriefingCard({
  spec,
  onStart,
}: {
  spec: MasteryChallengeSpec
  onStart: () => void
}) {
  return (
    <section className="problem mastery-card" data-step-type="mastery">
      <h2>Prove your mastery</h2>
      <p className="block-prompt">{spec.blurb}</p>
      <p className="mastery-card-note">
        First, {spec.recall.length} quick review questions. Then you’ll write code that proves you’ve
        truly got it. Everything must be correct to master this lesson — take your time.
      </p>
      <p className="mastery-card-note mastery-card-review">
        Want a refresher first? Spin up a quick AI lesson to review the tricky parts, then come back.
      </p>
      <div className="mastery-card-actions">
        <Link to="/create" className="btn-ghost">
          Review with an AI lesson
        </Link>
        <button type="button" className="btn-machine" onClick={onStart}>
          Start the challenge
        </button>
      </div>
    </section>
  )
}
