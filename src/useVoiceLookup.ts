import { useEffect, useRef, useState } from 'react'
import { CANCEL_COOLDOWN_MS, sleep, synthesisDuration } from '@/lib/pacing'
import { lookupSentence, type SentenceLookup } from '@/lib/sentence'

const TICK_MS = 100

export type LookupState =
  | { status: 'idle' }
  | { status: 'running'; progress: number }
  | { status: 'cancelling' }
  | { status: 'error' }
  | SentenceLookup

export function useVoiceLookup() {
  const [state, setState] = useState<LookupState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)
  const cache = useRef(new Map<string, string | null>())

  useEffect(() => () => controller.current?.abort(), [])

  const start = async (words: string[]) => {
    const current = new AbortController()
    controller.current = current
    const duration = synthesisDuration()
    const startedAt = Date.now()
    setState({ status: 'running', progress: 0 })
    const ticker = setInterval(
      () => setState({ status: 'running', progress: (Date.now() - startedAt) / duration }),
      TICK_MS,
    )

    try {
      const [result] = await Promise.all([
        lookupSentence(words, { signal: current.signal, cache: cache.current }).catch(
          (error: unknown): LookupState => {
            if (current.signal.aborted) throw error
            return { status: 'error' }
          },
        ),
        sleep(duration, current.signal),
      ])
      setState(result)
    } catch {
      return
    } finally {
      clearInterval(ticker)
    }
  }

  const cancel = async () => {
    controller.current?.abort()
    setState({ status: 'cancelling' })
    await sleep(CANCEL_COOLDOWN_MS)
    setState({ status: 'idle' })
  }

  const reset = () => {
    setState((previous) =>
      previous.status === 'running' || previous.status === 'cancelling'
        ? previous
        : { status: 'idle' },
    )
  }

  return { state, start, cancel, reset }
}
