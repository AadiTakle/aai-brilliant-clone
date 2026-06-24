import { blockCategory, getBlockDef, type BlockDef, type BlockSlot } from '../../lib/blocks/definitions'
import type { WorkspaceAction, WorkspaceBlock } from '../../lib/blocks/workspace'
import { DropZone } from './DropZone'

interface BlockViewProps {
  block: WorkspaceBlock
  heldType: string | null
  dispatch: (action: WorkspaceAction) => void
}

function RemoveButton({
  id,
  dispatch,
}: {
  id: string
  dispatch: (action: WorkspaceAction) => void
}) {
  return (
    <button
      type="button"
      className="block-remove"
      aria-label="Remove block"
      onClick={() => dispatch({ kind: 'remove', id })}
    >
      ×
    </button>
  )
}

/** A leaf value block (number / text / variable): an inline editable chip. */
function ValueLeaf({ block, def, dispatch }: { block: WorkspaceBlock; def: BlockDef; dispatch: BlockViewProps['dispatch'] }) {
  const f = def.fields[0]
  const value = String(block.fields[f.name] ?? '')
  const onChange = (raw: string) =>
    dispatch({
      kind: 'set-field',
      id: block.id,
      field: f.name,
      value: f.kind === 'number' ? Number(raw) : raw,
    })

  if (def.type === 'str') {
    return (
      <span className="chip chip-str">
        <span className="tok">&quot;</span>
        <input
          className="chip-input"
          aria-label={f.label ?? f.name}
          value={value}
          size={Math.max(value.length, 3)}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="tok">&quot;</span>
      </span>
    )
  }

  return (
    <span className={`chip chip-${def.type}`}>
      <input
        className="chip-input"
        type={f.kind === 'number' ? 'number' : 'text'}
        aria-label={f.label ?? f.name}
        value={value}
        size={Math.max(value.length, 2)}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  )
}

/** Renders a block's label, interleaving its `⬡` placeholders with expression slots. */
function InlineTokens({ block, def, heldType, dispatch }: { block: WorkspaceBlock; def: BlockDef; heldType: string | null; dispatch: BlockViewProps['dispatch'] }) {
  const exprSlots = def.slots.filter((s) => s.kind === 'expression')
  const parts = def.label.split('⬡')
  const heldIsValue = heldType ? blockCategory(heldType) === 'value' : false

  return (
    <>
      {parts.map((text, i) => (
        <span key={i} className="inline-part">
          {text && <span className="tok">{text}</span>}
          {i < exprSlots.length && (
            <ExpressionSlot
              parent={block}
              slot={exprSlots[i]}
              heldType={heldType}
              heldIsValue={heldIsValue}
              dispatch={dispatch}
            />
          )}
        </span>
      ))}
    </>
  )
}

function ExpressionSlot({
  parent,
  slot,
  heldType,
  heldIsValue,
  dispatch,
}: {
  parent: WorkspaceBlock
  slot: BlockSlot
  heldType: string | null
  heldIsValue: boolean
  dispatch: BlockViewProps['dispatch']
}) {
  const child = parent.slots[slot.name]?.[0]
  if (child) {
    return (
      <span className="expr-slot is-filled">
        <BlockView block={child} heldType={heldType} dispatch={dispatch} />
      </span>
    )
  }
  return (
    <DropZone
      id={`target:${parent.id}:${slot.name}`}
      variant="expression"
      active={heldType !== null && heldIsValue}
      onPlace={() => dispatch({ kind: 'place', target: { parentId: parent.id, slot: slot.name } })}
      label={slot.label ?? 'value'}
    />
  )
}

export function BlockView({ block, heldType, dispatch }: BlockViewProps) {
  const def = getBlockDef(block.type)
  if (!def) return null

  if (def.category === 'value') {
    const isLeaf = def.slots.length === 0
    return (
      <span className="value-block" data-block-type={block.type}>
        {isLeaf ? (
          <ValueLeaf block={block} def={def} dispatch={dispatch} />
        ) : (
          <span className="value-inline">
            <InlineTokens block={block} def={def} heldType={heldType} dispatch={dispatch} />
          </span>
        )}
        <RemoveButton id={block.id} dispatch={dispatch} />
      </span>
    )
  }

  const statementSlots = def.slots.filter((s) => s.kind === 'statement')
  const heldIsStatement = heldType ? blockCategory(heldType) === 'statement' : false

  return (
    <div className="block" data-block-type={block.type}>
      <div className="block-line">
        <code className="block-code">
          <InlineTokens block={block} def={def} heldType={heldType} dispatch={dispatch} />
        </code>
        <RemoveButton id={block.id} dispatch={dispatch} />
      </div>

      {statementSlots.map((slot) => (
        <div className="block-body" key={slot.name}>
          {(block.slots[slot.name] ?? []).map((child) => (
            <BlockView key={child.id} block={child} heldType={heldType} dispatch={dispatch} />
          ))}
          <DropZone
            id={`target:${block.id}:${slot.name}`}
            variant="statement"
            active={heldType !== null && heldIsStatement}
            onPlace={() => dispatch({ kind: 'place', target: { parentId: block.id, slot: slot.name } })}
            label="+ add statement"
          />
        </div>
      ))}
    </div>
  )
}
