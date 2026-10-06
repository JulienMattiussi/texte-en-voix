import { useEffect, useRef, useState } from 'react'
import { AUDIO_SPACING_MS, CANCEL_COOLDOWN_MS, sleep, synthesisDuration } from '@/lib/pacing'
import { createCaches, prepareSynthesis, type Voice } from '@/lib/synthesis'
import { player } from '@/player'

const TICK_MS = 100

export type SynthesisState =
  | { status: 'idle' }
  | { status: 'preparing'; progress: number }
  | { status: 'cancelling' }
  | { status: 'error' }
  | { status: 'impossible'; missing: string[] }
  | { status: 'ready'; voices: Voice<AudioBuffer>[]; playing: number | null }

export function useSynthesis() {
  const [state, setState] = useState<SynthesisState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)
  const stopPlayback = useRef<(() => void) | null>(null)
  const caches = useRef(createCaches<AudioBuffer>())

  const haltPlayback = () => {
    stopPlayback.current?.()
    stopPlayback.current = null
  }

  const stop = () => {
    haltPlayback()
    setState((previous) =>
      previous.status === 'ready' ? { ...previous, playing: null } : previous,
    )
  }

  useEffect(
    () => () => {
      controller.current?.abort()
      stopPlayback.current?.()
    },
    [],
  )

  const play = (voices: Voice<AudioBuffer>[]) => {
    haltPlayback()
    setState({ status: 'ready', voices, playing: 0 })
    stopPlayback.current = player.play(
      voices.map((voice) => voice.audio),
      {
        onWord: (index) =>
          setState((previous) =>
            previous.status === 'ready' ? { ...previous, playing: index } : previous,
          ),
        onEnd: stop,
      },
    )
  }

  const start = async (words: string[]) => {
    player.unlock()
    stop()
    const current = new AbortController()
    controller.current = current
    const duration = synthesisDuration()
    const startedAt = Date.now()
    setState({ status: 'preparing', progress: 0 })
    const ticker = setInterval(
      () => setState({ status: 'preparing', progress: (Date.now() - startedAt) / duration }),
      TICK_MS,
    )

    try {
      const [result] = await Promise.all([
        prepareSynthesis(words, {
          decode: player.decode,
          caches: caches.current,
          signal: current.signal,
          spacingMs: AUDIO_SPACING_MS,
        }).catch((error: unknown) => {
          if (current.signal.aborted) throw error
          return { status: 'error' } as const
        }),
        sleep(duration, current.signal),
      ])
      if (result.status === 'ready') play(result.voices)
      else setState(result)
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
    haltPlayback()
    setState((previous) =>
      previous.status === 'preparing' || previous.status === 'cancelling'
        ? previous
        : { status: 'idle' },
    )
  }

  const replay = () => {
    if (state.status === 'ready') play(state.voices)
  }

  return { state, start, cancel, reset, stop, replay }
}
