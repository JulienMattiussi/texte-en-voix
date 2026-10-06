import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { decodeText, fakeWiktionary, listen } from '../fakeWiktionary'

type PlaybackEvents = { onWord: (index: number) => void; onEnd: () => void }

const fakePlayer = vi.hoisted(() => ({
  unlock: vi.fn(),
  decode: vi.fn(),
  play: vi.fn<(buffers: unknown[], events: PlaybackEvents) => () => void>(),
  stop: vi.fn(),
}))

vi.mock('@/player', () => ({ player: fakePlayer }))

const WIKITEXTS = {
  salut: listen('France (Vosges)', 'salut.wav'),
  la: listen('Canada (Québec)', 'la.wav'),
}

function setup(text: string) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<App />)
  return {
    user,
    async typeText() {
      const textarea = screen.getByLabelText('Votre texte')
      await user.clear(textarea)
      await user.click(textarea)
      await user.paste(text)
    },
    read: () => user.click(screen.getByRole('button', { name: 'Lire' })),
  }
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

function itemsOf(listName: string) {
  return within(screen.getByRole('list', { name: listName }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    fakePlayer.decode.mockImplementation(decodeText)
    fakePlayer.play.mockReturnValue(fakePlayer.stop)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('counts the words of the typed text', async () => {
    const { typeText } = setup('Salut la compagnie')
    await typeText()
    expect(screen.getByText('3 / 50 mots')).toBeInTheDocument()
  })

  it('refuses texts longer than 50 words', async () => {
    const { typeText } = setup(Array.from({ length: 51 }, () => 'la').join(' '))
    await typeText()
    expect(screen.getByText('50 mots maximum : raccourcissez un peu votre texte.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Lire' })).toBeDisabled()
  })

  it('takes at least 5 seconds, then reads the sentence highlighting each word', async () => {
    vi.stubGlobal('fetch', fakeWiktionary(WIKITEXTS))
    const { typeText, read } = setup('Salut la')
    await typeText()
    await read()

    expect(screen.getByRole('progressbar', { name: 'Préparation de la voix' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Votre texte')).not.toBeInTheDocument()
    expect(itemsOf('Mots en préparation')).toEqual(['Salut\u00a0', 'la\u00a0'])
    expect(
      within(screen.getByRole('list', { name: 'Mots en préparation' })).queryByRole('link'),
    ).not.toBeInTheDocument()
    await wait(4800)
    expect(screen.queryByRole('list', { name: 'Voix trouvées' })).not.toBeInTheDocument()

    await wait(300)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(itemsOf('Voix trouvées')).toEqual(['SalutFrance (Vosges)', 'laCanada (Québec)'])
    const link = screen.getByRole('link', { name: /Salut/ })
    expect(link).toHaveAttribute('href', 'https://fr.wiktionary.org/wiki/salut')
    expect(link).toHaveAttribute('target', 'wiktionnaire')
    expect(fakePlayer.unlock).toHaveBeenCalled()
    expect(fakePlayer.play).toHaveBeenCalledOnce()
    const [buffers, events] = fakePlayer.play.mock.calls[0]!
    expect(buffers).toEqual(['salut.wav', 'la.wav'])

    act(() => events.onWord(1))
    expect(screen.getByText('la').closest('li')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByText('Salut').closest('li')).not.toHaveAttribute('aria-current')
    expect(screen.queryByRole('button', { name: 'Réécouter' })).not.toBeInTheDocument()

    act(() => events.onEnd())
    expect(screen.getByText('la').closest('li')).not.toHaveAttribute('aria-current')
  })

  it('replays instantly and stops on demand', async () => {
    vi.stubGlobal('fetch', fakeWiktionary(WIKITEXTS))
    const { user, typeText, read } = setup('Salut la')
    await typeText()
    await read()
    await wait(5100)

    await user.click(screen.getByRole('button', { name: 'Arrêter' }))
    expect(fakePlayer.stop).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Réécouter' }))
    expect(fakePlayer.play).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Arrêter' })).toBeInTheDocument()
  })

  it('goes back to the text, unchanged, to edit it', async () => {
    vi.stubGlobal('fetch', fakeWiktionary(WIKITEXTS))
    const { user, typeText, read } = setup('Salut la')
    await typeText()
    await read()
    await wait(5100)

    await user.click(screen.getByRole('button', { name: 'Modifier le texte' }))
    expect(fakePlayer.stop).toHaveBeenCalled()
    expect(screen.queryByRole('list', { name: 'Voix trouvées' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Votre texte')).toHaveValue('Salut la')
  })

  it('cancels in at least 3 seconds, then allows a new search', async () => {
    const fetchFn = fakeWiktionary(WIKITEXTS)
    vi.stubGlobal('fetch', fetchFn)
    const { user, typeText, read } = setup('Salut la')
    await typeText()
    await read()
    await wait(1000)
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByRole('button', { name: 'Annulation en cours…' })).toBeDisabled()
    expect(screen.getByLabelText('Votre texte')).toBeDisabled()
    expect(fetchFn.mock.calls[0]![1]?.signal?.aborted).toBe(true)
    await wait(2900)
    expect(screen.getByRole('button', { name: 'Annulation en cours…' })).toBeDisabled()
    await wait(200)
    expect(screen.getByRole('button', { name: 'Lire' })).toBeEnabled()
    expect(screen.queryByRole('list', { name: 'Voix trouvées' })).not.toBeInTheDocument()
  })

  it('cancels the synthesis when a word has no recording', async () => {
    vi.stubGlobal('fetch', fakeWiktionary(WIKITEXTS))
    const { typeText, read } = setup('Salut zzzqx')
    await typeText()
    await read()
    await wait(5000)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('La synthèse vocale n’est pas possible.')
    const page = within(alert).getByRole('link', { name: 'zzzqx' })
    expect(page).toHaveAttribute('href', 'https://fr.wiktionary.org/wiki/zzzqx')
    expect(page).toHaveAttribute('target', 'wiktionnaire')
    const record = within(alert).getByRole('link', { name: 'Lingua Libre' })
    expect(record).toHaveAttribute('href', 'https://lingualibre.org/app/')
    expect(record).toHaveAttribute('target', 'lingualibre')
  })

  it('reports an unreachable Wiktionary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const { read } = setup('')
    await read()
    await wait(5000)
    expect(screen.getByRole('alert')).toHaveTextContent('Le Wiktionnaire ne répond pas')
  })
})
