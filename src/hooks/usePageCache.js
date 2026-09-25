import { useState, useCallback } from 'react'

// Global cache persists for the browser session
const globalCache = {}

export function usePageCache(key) {
  const [, forceUpdate] = useState(0)

  const get = useCallback(() => globalCache[key] ?? null, [key])

  const set = useCallback((data) => {
    globalCache[key] = data
    forceUpdate(n => n + 1)
  }, [key])

  const clear = useCallback(() => {
    delete globalCache[key]
    forceUpdate(n => n + 1)
  }, [key])

  return { data: globalCache[key] ?? null, set, clear }
}
