import { useEffect, useState } from 'react'
import { typeSorterConfigSchema } from '../schema'

interface Props {
  config: unknown
  onComplete?: () => void
}

// Sort each value into "number" or "text". Builds the distinction between an int
// (you can do math with it) and a string (text in quotes) — needed before `%`
// and string concatenation.
export function TypeSorter({ config, onComplete }: Props) {
  const { items, caption } = typeSorterConfigSchema.parse(config)
  const [placed, setPlaced] = useState<Record<number, 'number' | 'text'>>({})

  const allCorrect =
    items.length > 0 && items.every((item, i) => placed[i] === item.type)

  useEffect(() => {
    if (allCorrect) onComplete?.()
  }, [allCorrect, onComplete])

  function choose(index: number, bucket: 'number' | 'text') {
    setPlaced((p) => ({ ...p, [index]: bucket }))
  }

  return (
    <div className="widget widget-type-sorter" data-widget="type_sorter">
      <ul className="ts-items">
        {items.map((item, i) => {
          const choice = placed[i]
          const correct = choice === item.type
          const status = choice ? (correct ? ' is-correct' : ' is-wrong') : ''
          return (
            <li key={i} className={`ts-item${status}`}>
              <code className="ts-label">{item.label}</code>
              <span className="ts-buttons">
                <button type="button" className={choice === 'number' ? 'is-selected' : ''} onClick={() => choose(i, 'number')}>
                  number
                </button>
                <button type="button" className={choice === 'text' ? 'is-selected' : ''} onClick={() => choose(i, 'text')}>
                  text
                </button>
              </span>
              {choice && <span className="ts-mark">{correct ? '✓' : '✗'}</span>}
            </li>
          )
        })}
      </ul>

      {caption && <p className="widget-caption">{caption}</p>}
      {allCorrect && (
        <p role="status" className="feedback feedback-correct">
          Nice sorting! Numbers do math; text in quotes is a string.
        </p>
      )}
    </div>
  )
}
