import { useEffect, useState } from 'react'

export type Unsubscribe = () => void
export type Subscribe<T> = (onData: (data: T) => void, onError: (error: Error) => void) => Unsubscribe

export interface SubscriptionState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
}

/**
 * Bridges a realtime listener into React state. `key` identifies the subscription:
 * when it changes the previous listener is torn down; when null nothing is subscribed.
 */
export function useSubscription<T>(key: string | null, subscribe: Subscribe<T>): SubscriptionState<T> {
  const [state, setState] = useState<SubscriptionState<T> & { key: string | null }>({
    key,
    data: undefined,
    error: undefined,
    loading: key !== null,
  })

  if (state.key !== key) {
    setState({ key, data: undefined, error: undefined, loading: key !== null })
  }

  useEffect(() => {
    if (key === null) return
    return subscribe(
      (data) => setState({ key, data, error: undefined, loading: false }),
      (error) => {
        console.error(`Subscription "${key}" failed`, error)
        setState({ key, data: undefined, error, loading: false })
      },
    )
    // `subscribe` is intentionally excluded: the key fully describes the subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { data: state.data, error: state.error, loading: state.loading }
}
