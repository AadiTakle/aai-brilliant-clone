import { blockCategory, getBlockDef, type BlockDef, type BlockField, type BlockSlot } from '../../lib/blocks/definitions'
import type { WorkspaceAction, WorkspaceBlock } from '../../lib/blocks/workspace'
import { DropZone } from './DropZone'

interface BlockViewProps {
  block: WorkspaceBlock
  heldType: string | null
  dispatch: (action: WorkspaceAction) => void
  // When true, the remove buttons are hidden so the learner can only edit
  // block contents, not delete blocks.
  locked?: boolean
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

  const isNumber = f.kind === 'number'
  return (
    <span className={`chip chip-${def.type}`}>
      <input
        className="chip-input"
        // Numbers use a text input (with numeric keypad) because the `size`
        // attribute is ignored on type="number", which makes those fields huge.
        type="text"
        inputMode={isNumber ? 'numeric' : 'text'}
        pattern={isNumber ? '[0-9]*' : undefined}
        aria-label={f.label ?? f.name}
        value={value}
        size={Math.max(value.length, 3)}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  )
}

/** An inline editable field that is part of a block, e.g. the operator dropdown. */
function FieldControl({
  block,
  field,
  dispatch,
}: {
  block: WorkspaceBlock
  field: BlockField
  dispatch: BlockViewProps['dispatch']
}) {
  const value = String(block.fields[field.name] ?? field.default)
  if (field.kind === 'select') {
    return (
      <span className="chip chip-op">
        <select
          className="chip-input chip-select"
          aria-label={field.label ?? field.name}
          value={value}
          onChange={(e) =>
            dispatch({ kind: 'set-field', id: block.id, field: field.name, value: e.target.value })
          }
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </span>
    )
  }
  const isNumber = field.kind === 'number'
  return (
    <span className="chip chip-field">
      <input
        className="chip-input"
        type="text"
        inputMode={isNumber ? 'numeric' : 'text'}
        aria-label={field.label ?? field.name}
        value={value}
        size={Math.max(value.length, 3)}
        onChange={(e) =>
          dispatch({
            kind: 'set-field',
            id: block.id,
            field: field.name,
            value: isNumber ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </span>
  )
}

/**
 * Renders a block's label, interleaving `⬡` (expression slots, in slot order)
 * and `◇` (inline fields, in field order) placeholders with the literal text.
 */
function InlineTokens({ block, def, heldType, dispatch, locked }: { block: WorkspaceBlock; def: BlockDef; heldType: string | null; dispatch: BlockViewProps['dispatch']; locked?: boolean }) {
  const exprSlots = def.slots.filter((s) => s.kind === 'expression')
  const heldIsValue = heldType ? blockCategory(heldType) === 'value' : false
  const tokens = def.label.split(/([⬡◇])/)
  let slotIdx = 0
  let fieldIdx = 0

  return (
    <>
      {tokens.map((token, i) => {
        if (token === '⬡') {
          const slot = exprSlots[slotIdx++]
          return slot ? (
            <ExpressionSlot
              key={i}
              parent={block}
              slot={slot}
              heldType={heldType}
              heldIsValue={heldIsValue}
              dispatch={dispatch}
              locked={locked}
            />
          ) : null
        }
        if (token === '◇') {
          const f = def.fields[fieldIdx++]
          return f ? <FieldControl key={i} block={block} field={f} dispatch={dispatch} /> : null
        }
        return token ? (
          <span key={i} className="tok">
            {token}
          </span>
        ) : null
      })}
    </>
  )
}

function ExpressionSlot({
  parent,
  slot,
  heldType,
  heldIsValue,
  dispatch,
  locked,
}: {
  parent: WorkspaceBlock
  slot: BlockSlot
  heldType: string | null
  heldIsValue: boolean
  dispatch: BlockViewProps['dispatch']
  locked?: boolean
}) {
  const child = parent.slots[slot.name]?.[0]
  if (child) {
    return (
      <span className="expr-slot is-filled">
        <BlockView block={child} heldType={heldType} dispatch={dispatch} locked={locked} />
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

export function BlockView({ block, heldType, dispatch, locked }: BlockViewProps) {
  const def = getBlockDef(block.type)
  if (!def) return null

  if (def.category === 'value') {
    const isLeaf = def.slots.length === 0
    // Leaf values (number/text/variable) are edited inline and are part of the
    // parent block, so they have no remove button. Composite values (range)
    // can be removed to clear the slot back to a drop target — unless locked.
    return (
      <span className="value-block" data-block-type={block.type}>
        {isLeaf ? (
          <ValueLeaf block={block} def={def} dispatch={dispatch} />
        ) : (
          <span className="value-inline">
            <InlineTokens block={block} def={def} heldType={heldType} dispatch={dispatch} locked={locked} />
            {!locked && <RemoveButton id={block.id} dispatch={dispatch} />}
          </span>
        )}
      </span>
    )
  }

  const statementSlots = def.slots.filter((s) => s.kind === 'statement')
  const heldIsStatement = heldType ? blockCategory(heldType) === 'statement' : false

  return (
    <div className="block" data-block-type={block.type}>
      <div className="block-line">
        <code className="block-code">
          <InlineTokens block={block} def={def} heldType={heldType} dispatch={dispatch} locked={locked} />
        </code>
        {!locked && <RemoveButton id={block.id} dispatch={dispatch} />}
      </div>

      {statementSlots.map((slot) => (
        <div className="block-body" key={slot.name}>
          {(block.slots[slot.name] ?? []).map((child) => (
            <BlockView key={child.id} block={child} heldType={heldType} dispatch={dispatch} locked={locked} />
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
