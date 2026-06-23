import type { WorkspaceAction, WorkspaceState } from '../../lib/blocks/workspace'
import { BlockView } from './BlockView'
import { DropZone } from './DropZone'

export function WorkspaceView({
  state,
  dispatch,
}: {
  state: WorkspaceState
  dispatch: (action: WorkspaceAction) => void
}) {
  return (
    <div className="workspace" aria-label="Program">
      {state.program.map((block) => (
        <BlockView key={block.id} block={block} heldType={state.held} dispatch={dispatch} />
      ))}
      <DropZone
        id="target:root:program"
        active={state.held !== null}
        onPlace={() => dispatch({ kind: 'place', target: { parentId: null, slot: 'program' } })}
        label="+ add block"
      />
    </div>
  )
}
