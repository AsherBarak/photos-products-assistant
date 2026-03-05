import '@testing-library/jest-dom'

// Node 25 ships a built-in localStorage that lacks the Web Storage API methods.
// Override it with a simple in-memory implementation so jsdom tests work correctly.
if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
  const store: Record<string, string> = {}
  const storage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value) },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { for (const key of Object.keys(store)) delete store[key] },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, writable: true, configurable: true })
}
