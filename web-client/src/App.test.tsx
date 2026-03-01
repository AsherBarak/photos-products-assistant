import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import { vi } from 'vitest'

describe('App', () => {
  it('renders chat interface', () => {
    render(<App />)
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('allows user to send messages', async () => {
    // Mock the fetch call
    const mockResponse = { response: 'Test Response' }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    } as Response)

    render(<App />)
    const input = screen.getByPlaceholderText(/type a message/i)
    const button = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.click(button)

    expect(await screen.findByText('Hello')).toBeInTheDocument()
    expect(await screen.findByText('Test Response')).toBeInTheDocument()
  })
})
