import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { fakeWiktionary, listen } from '../fakeWiktionary'

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
    find: () => user.click(screen.getByRole('button', { name: 'Trouver les voix' })),
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
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('lists and counts the words of the typed text', async () => {
    const { typeText } = setup('Salut la compagnie')
    await typeText()
    expect(itemsOf('Mots à prononcer')).toEqual(['Salut', 'la', 'compagnie'])
    expect(screen.getByText('3 / 50 mots')).toBeInTheDocument()
  })

  it('refuses texts longer than 50 words', async () => {
    const { typeText } = setup(Array.from({ length: 51 }, () => 'la').join(' '))
    await typeText()
    expect(screen.getByText('50 mots maximum : raccourcissez un peu votre texte.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Trouver les voix' })).toBeDisabled()
  })

  it('takes at least 5 seconds before showing the accent of each word', async () => {
    vi.stubGlobal('fetch', fakeWiktionary(WIKITEXTS))
    const { typeText, find } = setup('Salut la')
    await typeText()
    await find()

    expect(screen.getByRole('progressbar', { name: 'Recherche des voix' })).toBeInTheDocument()
    expect(screen.getByLabelText('Votre texte')).toBeDisabled()
    await wait(4800)
    expect(screen.queryByRole('list', { name: 'Voix trouvées' })).not.toBeInTheDocument()

    await wait(300)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(itemsOf('Voix trouvées')).toEqual(['SalutFrance (Vosges)', 'laCanada (Québec)'])
  })

  it('cancels in at least 3 seconds, then allows a new search', async () => {
    const fetchFn = fakeWiktionary(WIKITEXTS)
    vi.stubGlobal('fetch', fetchFn)
    const { user, typeText, find } = setup('Salut la')
    await typeText()
    await find()
    await wait(1000)
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    expect(screen.getByRole('button', { name: 'Annulation en cours…' })).toBeDisabled()
    expect(fetchFn.mock.calls[0]![1]?.signal?.aborted).toBe(true)
    await wait(2900)
    expect(screen.getByRole('button', { name: 'Annulation en cours…' })).toBeDisabled()
    await wait(200)
    expect(screen.getByRole('button', { name: 'Trouver les voix' })).toBeEnabled()
    expect(screen.queryByRole('list', { name: 'Voix trouvées' })).not.toBeInTheDocument()
  })

  it('cancels the synthesis when a word has no recording', async () => {
    vi.stubGlobal('fetch', fakeWiktionary(WIKITEXTS))
    const { typeText, find } = setup('Salut zzzqx')
    await typeText()
    await find()
    await wait(5000)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('La synthèse vocale n’est pas possible.')
    expect(alert).toHaveTextContent('Mots introuvables : zzzqx')
  })

  it('reports an unreachable Wiktionary', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const { find } = setup('')
    await find()
    await wait(5000)
    expect(screen.getByRole('alert')).toHaveTextContent('Le Wiktionnaire ne répond pas')
  })
})
