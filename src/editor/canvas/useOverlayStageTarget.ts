import { useEffect, useState } from 'react'

// Phase 13 § 5.3 — adapters look up the OverlayStage's portal target by
// id. The stage div mounts inside <Editor /> alongside <Frame>, so by
// the time this effect runs (post-commit) the element exists. Returns
// null on the first render; the adapter renders nothing inline until
// the target resolves and then portals into it.
export function useOverlayStageTarget(): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setTarget(document.getElementById('craftjs-overlay-stage'))
  }, [])
  return target
}
