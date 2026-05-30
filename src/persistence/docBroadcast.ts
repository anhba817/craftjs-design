// Phase 14 § 6.2 — cross-tab document sync via BroadcastChannel.
//
// Replaces the localStorage `storage` event the concurrent-edit watcher
// used to listen for. The `storage` event only fires for localStorage
// writes, so the moment the default backend is IndexedDB (Group B) it
// goes silent. BroadcastChannel works regardless of backend — every
// adapter write posts a small message here.
//
// BroadcastChannel deliberately does NOT deliver a message back to the
// channel instance that posted it, so a tab never reacts to its own
// writes (same semantics the `storage` event gave us for free). We keep
// one shared channel instance per tab so the document store (poster) and
// the watcher (subscriber) don't echo to each other within a tab.

const CHANNEL_NAME = 'crafted-design:docs'

export type DocBroadcastMessage =
  | { type: 'index-changed' }
  | { type: 'doc-changed'; docId: string }

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/** Notify other tabs that the index or a document blob changed. */
export function postDocBroadcast(message: DocBroadcastMessage): void {
  try {
    getChannel()?.postMessage(message)
  } catch {
    // A closed channel or serialization failure is non-fatal — cross-tab
    // sync is best-effort, the local write already succeeded.
  }
}

/** Subscribe to other tabs' document changes. Returns an unsubscribe fn. */
export function subscribeDocBroadcast(
  handler: (message: DocBroadcastMessage) => void,
): () => void {
  const ch = getChannel()
  if (!ch) return () => {}
  const listener = (event: MessageEvent) => handler(event.data as DocBroadcastMessage)
  ch.addEventListener('message', listener)
  return () => ch.removeEventListener('message', listener)
}

/** Test helper — close + drop the cached channel. */
export function resetDocBroadcast(): void {
  channel?.close()
  channel = null
}
