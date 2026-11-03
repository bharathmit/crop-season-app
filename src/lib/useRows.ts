import { useCallback, useEffect, useState } from 'react'

// Minimal data hook: runs `load`, exposes data / error / loading and reload().
// `load` must return { data, error } like a Supabase query.
export function useRows<T>(
  load: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
  deps: unknown[],
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  useEffect(() => {
    let alive = true
    setLoading(true)
    run().then(({ data, error }) => {
      if (!alive) return
      setData(data)
      setError(error?.message ?? null)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [run, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, error, loading, reload }
}
