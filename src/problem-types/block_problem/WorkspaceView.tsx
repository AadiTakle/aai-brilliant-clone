import { blockCategory } from '../../lib/blocks/definitions'
import type { WorkspaceAction, WorkspaceState } from '../../lib/blocks/workspace'
import { BlockView } from './BlockView'
import { DropZone } from './DropZone'

export function WorkspaceView({
  state,
  dispatch,
  locked = false,
}: {
  state: WorkspaceState
  dispatch: (action: WorkspaceAction) => void
  locked?: boolean
}) {
  const heldIsStatement = state.held ? blockCategory(state.held) === 'statement' : false
  return (
    <div className="workspace" aria-label="Program">
      {state.program.map((block) => (
        <BlockView key={block.id} block={block} heldType={state.held} dispatch={dispatch} locked={locked} />
      ))}
      <DropZone
        id="target:root:program"
        variant="statement"
        active={state.held !== null && heldIsStatement}
        onPlace={() => dispatch({ kind: 'place', target: { parentId: null, slot: 'program' } })}
        label="+ add block"
      />
    </div>
  )
}
