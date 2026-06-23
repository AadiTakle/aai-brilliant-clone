import { useDroppable } from '@dnd-kit/core'

export function DropZone({
  id,
  active,
  onPlace,
  label,
}: {
  id: string
  active: boolean
  onPlace: () => void
  label: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`drop-zone${active ? ' is-active' : ''}${isOver ? ' is-over' : ''}`}
      onClick={active ? onPlace : undefined}
      disabled={!active}
    >
      {label}
    </button>
  )
}
