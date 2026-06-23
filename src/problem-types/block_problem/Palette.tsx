import { useDraggable } from '@dnd-kit/core'
import { getBlockDef } from '../../lib/blocks/definitions'

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
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`palette-item${held ? ' is-held' : ''}${isDragging ? ' is-dragging' : ''}`}
      onClick={onPick}
      {...listeners}
      {...attributes}
    >
      <code>{def?.label ?? type}</code>
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
  return (
    <div className="palette" aria-label="Block palette">
      {types.map((type) => (
        <PaletteItem key={type} type={type} held={heldType === type} onPick={() => onPick(type)} />
      ))}
    </div>
  )
}
