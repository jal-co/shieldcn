/**
 * shieldcn
 * lib/use-hydrated
 *
 * Returns false during SSR and the first client render, then true once
 * hydrated — the standard "only-render-this-after-mount" gate, but built on
 * useSyncExternalStore instead of the `useState(false)` + `useEffect(() =>
 * setMounted(true))` idiom.
 *
 * The effect idiom trips React Compiler's `set-state-in-effect` rule (it's a
 * synchronous setState in an effect, which schedules an extra cascading
 * render). useSyncExternalStore expresses the same "server value differs from
 * client value" intent as a first-class hydration-safe read: `getServerSnapshot`
 * returns false, `getSnapshot` returns true, and React swaps them at hydration
 * with no extra render and no lint violation. The subscribe callback is a no-op
 * because the value never changes after hydration.
 */

import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client: hydrated
    () => false, // server / first paint: not yet
  )
}
