import { useCallback, useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import type { StepRenderProps } from '../types'
import type { Activity, Panel } from './schema'
import { Checkpoint } from './Checkpoint'
import { RepeatedAddition } from './widgets/RepeatedAddition'
import { LoopVisualizer } from './widgets/LoopVisualizer'
import { FunctionMachine } from './widgets/FunctionMachine'
import { VariableBox } from './widgets/VariableBox'
import { TypeSorter } from './widgets/TypeSorter'
import { RemainderMachine } from './widgets/RemainderMachine'
import { MultiplesGrid } from './widgets/MultiplesGrid'
import { ComparisonExplorer } from './widgets/ComparisonExplorer'
import { BranchVisualizer } from './widgets/BranchVisualizer'
import { CodeTracer } from './widgets/CodeTracer'

function ActivityView({ activity, onComplete }: { activity: Activity; onComplete: () => void }) {
  if (activity.kind === 'checkpoint') {
    return <Checkpoint block={activity} onComplete={onComplete} />
  }
  switch (activity.widget) {
    case 'repeated_addition':
      return <RepeatedAddition config={activity.config} onComplete={onComplete} />
    case 'loop_visualizer':
      return <LoopVisualizer config={activity.config} onComplete={onComplete} />
    case 'function_machine':
      return <FunctionMachine config={activity.config} onComplete={onComplete} />
    case 'variable_box':
      return <VariableBox config={activity.config} onComplete={onComplete} />
    case 'type_sorter':
      return <TypeSorter config={activity.config} onComplete={onComplete} />
    case 'remainder_machine':
      return <RemainderMachine config={activity.config} onComplete={onComplete} />
    case 'multiples_grid':
      return <MultiplesGrid config={activity.config} onComplete={onComplete} />
    case 'comparison_explorer':
      return <ComparisonExplorer config={activity.config} onComplete={onComplete} />
    case 'branch_visualizer':
      return <BranchVisualizer config={activity.config} onComplete={onComplete} />
    case 'code_tracer':
      return <CodeTracer config={activity.config} onComplete={onComplete} />
    default:
      return null
  }
}

interface ArticleBodyProps {
  title?: string
  panels: Panel[]
  onComplete?: () => void
}

function ArticleBody({ title, panels, onComplete }: ArticleBodyProps) {
  // How many panels are visible (>= 1), and which panels' activities are done.
  const [revealed, setRevealed] = useState(1)
  const [done, setDone] = useState<Set<number>>(new Set())

  const markActivityDone = useCallback((index: number) => {
    setDone((prev) => {
      if (prev.has(index)) return prev
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [])

  const panelComplete = useCallback(
    (index: number) => !panels[index].activity || done.has(index),
    [panels, done],
  )

  const currentIndex = revealed - 1
  const isLastPanel = currentIndex === panels.length - 1
  const currentComplete = panelComplete(currentIndex)
  const articleComplete = isLastPanel && currentComplete

  useEffect(() => {
    if (articleComplete) onComplete?.()
  }, [articleComplete, onComplete])

  return (
    <section className="problem problem-article article" data-step-type="article">
      {title && <h2>{title}</h2>}

      <ol className="article-panels">
        {panels.slice(0, revealed).map((panel, index) => (
          <li className="article-panel" key={index} data-panel={index}>
            {panel.text && (
              <div className="article-prose">
                <Markdown>{panel.text}</Markdown>
              </div>
            )}
            {panel.activity && (
              <ActivityView activity={panel.activity} onComplete={() => markActivityDone(index)} />
            )}
          </li>
        ))}
      </ol>

      {!isLastPanel && (
        <div className="article-advance">
          <button
            type="button"
            className="article-continue"
            disabled={!currentComplete}
            onClick={() => setRevealed((r) => Math.min(r + 1, panels.length))}
          >
            Continue
          </button>
        </div>
      )}
    </section>
  )
}

export function ArticleStep({ step, onComplete }: StepRenderProps) {
  if (step.type !== 'article') return null
  return <ArticleBody title={step.title} panels={step.config.panels} onComplete={onComplete} />
}
