import { getBlockDef } from '../../lib/blocks/definitions'
import type { WorkspaceAction, WorkspaceBlock } from '../../lib/blocks/workspace'
import { DropZone } from './DropZone'

interface BlockViewProps {
  block: WorkspaceBlock
  heldType: string | null
  dispatch: (action: WorkspaceAction) => void
}

export function BlockView({ block, heldType, dispatch }: BlockViewProps) {
  const def = getBlockDef(block.type)
  if (!def) return null

  return (
    <div className="block" data-block-type={block.type}>
      <div className="block-header">
        <code className="block-label">{def.label}</code>
        <button
          type="button"
          className="block-remove"
          aria-label="Remove block"
          onClick={() => dispatch({ kind: 'remove', id: block.id })}
        >
          ×
        </button>
      </div>

      {def.fields.length > 0 && (
        <div className="block-fields">
          {def.fields.map((f) => (
            <label key={f.name} className="block-field">
              {f.label ?? f.name}
              <input
                type={f.kind === 'number' ? 'number' : 'text'}
                value={String(block.fields[f.name] ?? '')}
                onChange={(e) =>
                  dispatch({
                    kind: 'set-field',
                    id: block.id,
                    field: f.name,
                    value: f.kind === 'number' ? Number(e.target.value) : e.target.value,
                  })
                }
              />
            </label>
          ))}
        </div>
      )}

      {def.slots.map((slot) => (
        <div className="block-slot" key={slot.name}>
          {slot.label && <span className="block-slot-label">{slot.label}</span>}
          <div className="block-slot-body">
            {(block.slots[slot.name] ?? []).map((child) => (
              <BlockView key={child.id} block={child} heldType={heldType} dispatch={dispatch} />
            ))}
            <DropZone
              id={`target:${block.id}:${slot.name}`}
              active={heldType !== null}
              onPlace={() =>
                dispatch({ kind: 'place', target: { parentId: block.id, slot: slot.name } })
              }
              label="+ place here"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
