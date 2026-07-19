/**
 * shieldcn
 * lib/use-debounced-value.ts
 *
 * Returns a debounced copy of a fast-changing value. Use to decouple cheap,
 * per-keystroke input state from expensive downstream work (network fetches,
 * server-rendered previews) so the input stays responsive while the heavy work
 * only runs once typing settles.
 */

import { useEffect, useState } from "react"

export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
