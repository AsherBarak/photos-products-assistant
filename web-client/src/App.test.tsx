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
          response.scope = {
            trip: 'Greece Trip',
            product_type: 'photo_album'
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

  it('sends scope and data_readiness in chat request and updates scope from response', async () => {
    render(<App />)

    await waitFor(() => expect(screen.queryByText(/Analyzing your photos/i)).not.toBeInTheDocument())

    const input = screen.getByPlaceholderText(/Tell me about your photos/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'Show me Greece photos' } })
    fireEvent.click(button)

    await screen.findByText('Test Response')

    // Verify the first chat call included scope and data_readiness in the request body
    const chatCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: any[]) => call[0].includes('/chat')
    )
    expect(chatCalls.length).toBeGreaterThanOrEqual(1)

    const firstChatBody = JSON.parse(chatCalls[0][1].body)
    expect(firstChatBody).toHaveProperty('scope')
    expect(firstChatBody).toHaveProperty('data_readiness')
    expect(firstChatBody.data_readiness).toHaveProperty('metadata', 'complete')
    expect(firstChatBody.data_readiness).toHaveProperty('clip_embeddings')
    expect(firstChatBody.data_readiness).toHaveProperty('face_embeddings')
    expect(firstChatBody.data_readiness.clip_embeddings.total).toBe(2500)

    // Now send a second message — the scope from the first response should be sent back
    fireEvent.change(input, { target: { value: 'What about sunsets?' } })
    fireEvent.click(button)

    await waitFor(() => {
      const allChatCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: any[]) => call[0].includes('/chat')
      )
      expect(allChatCalls.length).toBeGreaterThanOrEqual(2)
    })

    const allChatCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: any[]) => call[0].includes('/chat')
    )
    const secondChatBody = JSON.parse(allChatCalls[1][1].body)
    // The scope from the first response should now be sent back
    expect(secondChatBody.scope).toEqual({
      trip: 'Greece Trip',
      product_type: 'photo_album'
    })
    // data_readiness in_scope should be updated since scope is now set
    expect(secondChatBody.data_readiness.clip_embeddings.in_scope).toBeLessThan(2500)
    expect(secondChatBody.data_readiness.clip_embeddings.in_scope).toBeGreaterThan(0)
  })

  it('works when server returns no scope (backward compatible)', async () => {
    // Override fetch to return no scope
    let chatCallCount = 0
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/process-photos')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ important_days: [], trips: [] })
        })
      }
      if (url.includes('/chat')) {
        chatCallCount++
        // No scope or picker in response
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Hello there' })
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<App />)

    await waitFor(() => expect(screen.queryByText(/Analyzing your photos/i)).not.toBeInTheDocument())

    const input = screen.getByPlaceholderText(/Tell me about your photos/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'Hi' } })
    fireEvent.click(button)

    expect(await screen.findByText('Hello there')).toBeInTheDocument()

    // Verify scope is null in the request (no server-provided scope yet)
    const chatCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: any[]) => call[0].includes('/chat')
    )
    const body = JSON.parse(chatCalls[0][1].body)
    expect(body.scope).toBeNull()
    // data_readiness should still be sent
    expect(body.data_readiness.metadata).toBe('complete')
  })
})
