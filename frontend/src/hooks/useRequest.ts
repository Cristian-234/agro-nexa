import { useCallback, useEffect, useRef, useState } from 'react'

type Result<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

export function useRequest<T>() {
  const [result, setResult] = useState<Result<T>>({ status: 'idle' })
  const active = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    active.current?.abort()
    setResult({ status: 'idle' })
  }, [])

  const load = useCallback((operation: (signal: AbortSignal) => Promise<T>) => {
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    setResult({ status: 'loading' })
    void operation(controller.signal).then(
      (data) => { if (!controller.signal.aborted) setResult({ status: 'ready', data }) },
      (error: unknown) => {
        if (!controller.signal.aborted) setResult({
          status: 'error',
          message: error instanceof Error ? error.message : 'La consulta no pudo completarse.',
        })
      },
    )
  }, [])

  useEffect(() => () => active.current?.abort(), [])
  return { result, load, reset }
}
