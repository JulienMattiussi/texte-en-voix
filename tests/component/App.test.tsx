import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'

describe('App', () => {
  it('lists the words of the typed text', async () => {
    render(<App />)
    const textarea = screen.getByLabelText('Votre texte')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Salut la compagnie')

    const list = screen.getByRole('list', { name: 'Mots à prononcer' })
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['salut', 'la', 'compagnie'])
  })
})
