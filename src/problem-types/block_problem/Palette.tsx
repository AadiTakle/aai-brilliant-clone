import { useDraggable } from '@dnd-kit/core'
import { blockCategory, getBlockDef } from '../../lib/blocks/definitions'

function PaletteItem({
  type,
  held,
  onPick,
}: {
  type: string
  held: boolean
  onPick: () => void
}) {
  const def = getBlockDef(type)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `palette:${type}` })
  const label = (def?.label ?? type).replaceAll('⬡', '▢')
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`palette-item${held ? ' is-held' : ''}${isDragging ? ' is-dragging' : ''}`}
      onClick={onPick}
      {...listeners}
      {...attributes}
    >
      <code>{label}</code>
    </button>
  )
}

export function Palette({
  types,
  heldType,
  onPick,
}: {
  types: string[]
  heldType: string | null
  onPick: (type: string) => void
}) {
  const statements = types.filter((t) => blockCategory(t) === 'statement')
  const values = types.filter((t) => blockCategory(t) === 'value')

  return (
    <div className="palette" aria-label="Block palette">
      {statements.length > 0 && (
        <div className="palette-group">
          <p className="palette-group-label">Blocks</p>
          {statements.map((type) => (
            <PaletteItem key={type} type={type} held={heldType === type} onPick={() => onPick(type)} />
          ))}
        </div>
      )}
      {values.length > 0 && (
        <div className="palette-group">
          <p className="palette-group-label">Values</p>
          {values.map((type) => (
            <PaletteItem key={type} type={type} held={heldType === type} onPick={() => onPick(type)} />
          ))}
        </div>
      )}
    </div>
  )
}
