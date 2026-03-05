import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App'
import { vi } from 'vitest'
import { PhotoServiceContext } from './PhotoServiceContext'
import type { PhotoService } from './photoService'

const mockPhotos = [
  { id: 'p1', timestamp: '2024-01-01T00:00:00', latitude: 32.06, longitude: 34.77, exif: {}, additional_metadata: {} },
  { id: 'p2', timestamp: '2024-01-02T00:00:00', latitude: 32.06, longitude: 34.77, exif: {}, additional_metadata: {} },
]

const mockService: PhotoService = {
  fetchAllPhotos: vi.fn().mockResolvedValue(mockPhotos),
  fetchEmbedding: vi.fn().mockResolvedValue({
    photo_id: 'p1', clip_embedding: [], face_embedding: [], faces_detected: 0,
  }),
}

function renderApp() {
  return render(
    <PhotoServiceContext.Provider value={mockService}>
      <App />
    </PhotoServiceContext.Provider>
  )
}

describe('App', () => {
  beforeEach(() => {
    let chatCallCount = 0
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/process-photos')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ important_days: [], trips: [] })
        })
      }
      if (url.includes('/upload-embeddings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ received: 2, total_stored: 2 })
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
    renderApp()

    // Processing should finish quickly in test
    await waitFor(() => expect(screen.queryByText(/Analyzing your photos/i)).not.toBeInTheDocument())

    expect(screen.getByPlaceholderText(/Tell me about your photos/i)).toBeInTheDocument()
  })

  it('allows user to send messages and see pickers', async () => {
    renderApp()

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
    renderApp()

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
    expect(firstChatBody.data_readiness.clip_embeddings.total).toBe(mockPhotos.length)

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

  it('sends X-Client-Id header on all requests', async () => {
    renderApp()

    await waitFor(() => expect(screen.queryByText(/Analyzing your photos/i)).not.toBeInTheDocument())

    const input = screen.getByPlaceholderText(/Tell me about your photos/i)
    const button = screen.getByRole('button')

    fireEvent.change(input, { target: { value: 'Hello' } })
    fireEvent.click(button)

    await screen.findByText('Test Response')

    // All fetch calls should include the X-Client-Id header
    const allCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
    for (const call of allCalls) {
      const headers = call[1]?.headers
      if (headers) {
        expect(headers['X-Client-Id']).toBeDefined()
        expect(headers['X-Client-Id']).toMatch(/^.+$/) // non-empty
      }
    }
  })

  it('works when server returns no scope (backward compatible)', async () => {
    // Override fetch to return no scope/picker from chat
    let chatCallCount = 0
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/process-photos')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ important_days: [], trips: [] })
        })
      }
      if (url.includes('/upload-embeddings')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ received: 2, total_stored: 2 })
        })
      }
      if (url.includes('/chat')) {
        chatCallCount++
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Hello there' })
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    renderApp()

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
