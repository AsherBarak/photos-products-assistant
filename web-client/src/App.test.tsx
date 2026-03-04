import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import { vi } from 'vitest'

describe('App', () => {
  beforeEach(() => {
    (window as any).IS_TEST = true
    let chatCallCount = 0
    // Mock both endpoints
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/process-photos')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ important_days: [], trips: [] })
        })
      }
      if (url.includes('/chat')) {
        chatCallCount++
        const response: any = { response: 'Test Response' }
        if (chatCallCount === 1) {
          response.picker = {
            type: 'text',
            options: [{ id: 'opt1', label: 'Option 1' }]
          }
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response)
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
  })

  it('renders chat interface and handles background processing', async () => {
    render(<App />)
    
    // Processing should finish quickly in test
    await waitFor(() => expect(screen.queryByText(/Analyzing your photos/i)).not.toBeInTheDocument())
    
    expect(screen.getByPlaceholderText(/Tell me about your photos/i)).toBeInTheDocument()
  })

  it('allows user to send messages and see pickers', async () => {
    render(<App />)
    
    await waitFor(() => expect(screen.queryByText(/Analyzing your photos/i)).not.toBeInTheDocument())

    const input = screen.getByPlaceholderText(/Tell me about your photos/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'I want an album' } })
    fireEvent.click(button)

    expect(await screen.findByText('I want an album')).toBeInTheDocument()
    expect(await screen.findByText('Test Response')).toBeInTheDocument()
    
    // Check for picker
    expect(await screen.findByText('Option 1')).toBeInTheDocument()
    
    // Click picker option
    const option = screen.getByText('Option 1')
    fireEvent.click(option)
    
    // Picker should be gone and new message sent
    expect(await screen.findByText('Option 1', { selector: '.message.user' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Option 1', { selector: '.picker-option span' })).not.toBeInTheDocument())
  })
})
