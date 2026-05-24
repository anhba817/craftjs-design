import { useEditor } from '@craftjs/core'
import { useEffect, useSyncExternalStore } from 'react'
import { getResolver } from '@/craft/resolver'
import { getRegistryVersion, subscribeRegistry } from '@/registry/registry'

// Phase 7 — hot canonical reload.
//
// The Editor passes a resolver to <Craft> as a prop, but Craft captures it
// once in its internal store at mount. To pick up post-mount registrations
// we subscribe to the registry version counter and call actions.setOptions
// to swap the resolver into Craft's options. The Toolbox separately reads
// getResolver() via its own subscribe so the new canonical appears as a
// drag source immediately.
//
// Render: nothing. This is a side-effect component, like Hydrator.
export function ResolverUpdater() {
  const { actions } = useEditor()
  const version = useSyncExternalStore(
    subscribeRegistry,
    getRegistryVersion,
    getRegistryVersion,
  )

  useEffect(() => {
    actions.setOptions((options: { resolver?: unknown }) => {
      options.resolver = getResolver()
    })
  }, [actions, version])

  return null
}
