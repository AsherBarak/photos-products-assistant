import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import { vi } from 'vitest'

describe('App', () => {
  beforeEach(() => {
    // Mock both endpoints
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/process-photos')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ important_days: [], trips: [] })
        })
      }
      if (url.includes('/chat')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Test Response' })
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('renders chat interface', async () => {
    render(<App />)
    // Wait for processing to finish
    await waitFor(() => expect(screen.queryByText(/Analyzing your photos/i)).not.toBeInTheDocument())
    
    expect(screen.getByPlaceholderText(/Tell me about your photos/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('allows user to send messages', async () => {
    render(<App />)
    
    // Wait for processing to finish
    await waitFor(() => expect(screen.queryByText(/Analyzing your photos/i)).not.toBeInTheDocument())

    const input = screen.getByPlaceholderText(/Tell me about your photos/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.click(button)

    expect(await screen.findByText('Hello')).toBeInTheDocument()
    expect(await screen.findByText('Test Response')).toBeInTheDocument()
  })
})
