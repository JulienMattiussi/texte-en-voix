import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { EXAMPLES } from '@/lib/examples'
import { LOADING_MESSAGES, MESSAGE_PERIOD_MS, UNLOADING_MESSAGES } from '@/lib/messages'
import { decodeText, fakeWikimedia, listen } from '../fakeWikimedia'

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

  it('welcomes the visitor with an example sentence', () => {
    setup('')
    expect(screen.getByLabelText('Votre texte')).toHaveValue(EXAMPLES[0])
  })

  it('credits the author in the footer', () => {
    setup('')
    expect(screen.getByRole('link', { name: 'YavaDeus' })).toHaveAttribute(
      'href',
      'https://yavadeus.vercel.app/',
    )
  })

  it('opens a shared link with its sentence, then cleans the address', () => {
    history.replaceState(null, '', '/#texte=Le%20canard%20est%20un%20brigand')
    setup('')
    expect(screen.getByLabelText('Votre texte')).toHaveValue('Le canard est un brigand')
    expect(location.hash).toBe('')
  })

  describe('sharing a sentence', () => {
    async function readSentence() {
      vi.stubGlobal('fetch', fakeWikimedia(WIKITEXTS))
      const { user, typeText, read } = setup('Salut la')
      await typeText()
      await read()
      await wait(5100)
      return user
    }

    afterEach(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    })

    it('uses the native share sheet when the device has one', async () => {
      const share = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'share', { value: share, configurable: true })
      const user = await readSentence()
      await user.click(screen.getByRole('button', { name: 'Partager' }))
      expect(share).toHaveBeenCalledWith({
        title: 'Texte en voix',
        text: '« Salut la »',
        url: `${location.origin}/#texte=Salut+la`,
      })
    })

    it('copies the link otherwise', async () => {
      const user = await readSentence()
      const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
      await user.click(screen.getByRole('button', { name: 'Partager' }))
      expect(writeText).toHaveBeenCalledWith(`${location.origin}/#texte=Salut+la`)
      expect(screen.getByRole('status')).toHaveTextContent('Lien copié')
      await wait(2000)
      expect(screen.getByRole('status')).toBeEmptyDOMElement()
    })
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
    vi.stubGlobal('fetch', fakeWikimedia(WIKITEXTS))
    const { typeText, read } = setup('Salut la')
    await typeText()
    await read()

    expect(screen.getByRole('progressbar', { name: 'Préparation de la voix' })).toBeInTheDocument()
    expect(screen.getByText(LOADING_MESSAGES[0]!)).toBeInTheDocument()
    await wait(MESSAGE_PERIOD_MS)
    expect(screen.getByText(LOADING_MESSAGES[1]!)).toBeInTheDocument()
    expect(screen.queryByLabelText('Votre texte')).not.toBeInTheDocument()
    expect(itemsOf('Mots en préparation')).toEqual(['Salut\u00a0', 'la\u00a0'])
    await wait(3000)
    expect(
      within(screen.getByRole('list', { name: 'Mots en préparation' })).queryByRole('listitem', {
        current: true,
      }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Mots en préparation' })).queryByRole('link'),
    ).not.toBeInTheDocument()
    await wait(1800 - MESSAGE_PERIOD_MS)
    expect(screen.queryByRole('list', { name: 'Voix trouvées' })).not.toBeInTheDocument()

    await wait(300)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(itemsOf('Voix trouvées')).toEqual([
      'SalutFrance (Vosges)🎙 voix : LoquaxFR',
      'laCanada (Québec)🎙 voix : LoquaxFR',
    ])
    expect(screen.getByRole('link', { name: /Salut/ })).toHaveAttribute(
      'title',
      '« Salut » sur le Wiktionnaire. Voix : LoquaxFR, licence CC BY-SA 4.0',
    )
    expect(screen.getByRole('link', { name: 'Wikimedia Commons' })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/',
    )
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
    vi.stubGlobal('fetch', fakeWikimedia(WIKITEXTS))
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
    vi.stubGlobal('fetch', fakeWikimedia(WIKITEXTS))
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
    const fetchFn = fakeWikimedia(WIKITEXTS)
    vi.stubGlobal('fetch', fetchFn)
    const { user, typeText, read } = setup('Salut la')
    await typeText()
    await read()
    await wait(1000)
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByRole('button', { name: 'Annulation en cours…' })).toBeDisabled()
    expect(screen.getByText(UNLOADING_MESSAGES[0]!)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Annulation' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Votre texte')).not.toBeInTheDocument()
    expect(fetchFn.mock.calls[0]![1]?.signal?.aborted).toBe(true)
    await wait(2900)
    expect(screen.getByRole('button', { name: 'Annulation en cours…' })).toBeDisabled()
    await wait(200)
    expect(screen.getByRole('button', { name: 'Lire' })).toBeEnabled()
    expect(screen.queryByRole('list', { name: 'Voix trouvées' })).not.toBeInTheDocument()
  })

  it('cancels the synthesis when a word has no recording', async () => {
    vi.stubGlobal('fetch', fakeWikimedia(WIKITEXTS))
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
