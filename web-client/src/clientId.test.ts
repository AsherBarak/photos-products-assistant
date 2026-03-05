import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getClientId } from './clientId'

describe('getClientId', () => {
  const store: Record<string, string> = {}

  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key]
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
      clear: vi.fn(() => { for (const key of Object.keys(store)) delete store[key] }),
      length: 0,
      key: vi.fn(() => null),
    })
  })

  it('generates a UUID and stores it in localStorage', () => {
    const id = getClientId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(localStorage.setItem).toHaveBeenCalledWith('mixtiles_client_id', id)
  })

  it('returns the same ID on subsequent calls', () => {
    const id1 = getClientId()
    const id2 = getClientId()
    expect(id1).toBe(id2)
  })

  it('reuses an existing ID from localStorage', () => {
    store['mixtiles_client_id'] = 'existing-id-123'
    const id = getClientId()
    expect(id).toBe('existing-id-123')
  })
})
