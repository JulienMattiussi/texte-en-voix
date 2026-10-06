import { normalizationGain, timeline, voiceBounds } from '@/lib/audio'

const LEAD_IN_S = 0.05

let context: AudioContext | null = null

function audioContext(): AudioContext {
  context ??= new AudioContext()
  return context
}

type PlaybackEvents = {
  onWord: (index: number) => void
  onEnd: () => void
}

export const player = {
  // Must run inside the click handler: browsers only allow audio started by a user gesture.
  unlock() {
    void audioContext().resume()
  },

  decode(data: ArrayBuffer): Promise<AudioBuffer> {
    return audioContext().decodeAudioData(data)
  },

  play(buffers: AudioBuffer[], { onWord, onEnd }: PlaybackEvents): () => void {
    const ctx = audioContext()
    const clips = buffers.map((buffer) => {
      const samples = buffer.getChannelData(0)
      const { start, end } = voiceBounds(samples, buffer.sampleRate)
      return {
        buffer,
        offset: start / buffer.sampleRate,
        duration: (end - start) / buffer.sampleRate,
        gain: normalizationGain(samples, start, end),
      }
    })
    const { starts, total } = timeline(clips.map((clip) => clip.duration))
    const origin = ctx.currentTime + LEAD_IN_S

    const sources = clips.map((clip, index) => {
      const gain = ctx.createGain()
      gain.gain.value = clip.gain
      const source = ctx.createBufferSource()
      source.buffer = clip.buffer
      source.connect(gain).connect(ctx.destination)
      source.start(origin + starts[index]!, clip.offset, clip.duration)
      return source
    })
    const timers = [
      ...starts.map((start, index) => setTimeout(() => onWord(index), (LEAD_IN_S + start) * 1000)),
      setTimeout(onEnd, (LEAD_IN_S + total) * 1000),
    ]

    return () => {
      timers.forEach(clearTimeout)
      sources.forEach((source) => source.stop())
    }
  },
}
