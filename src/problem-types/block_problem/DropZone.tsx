import { useDroppable } from '@dnd-kit/core'

export function DropZone({
  id,
  active,
  onPlace,
  label,
  variant = 'statement',
}: {
  id: string
  active: boolean
  onPlace: () => void
  label: string
  variant?: 'statement' | 'expression'
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`drop-zone drop-zone-${variant}${active ? ' is-active' : ''}${isOver ? ' is-over' : ''}`}
      onClick={active ? onPlace : undefined}
      disabled={!active}
    >
      {label}
    </button>
  )
}
