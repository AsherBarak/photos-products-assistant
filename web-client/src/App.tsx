import { useState, useEffect } from 'react'
import './App.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface PhotoMetadata {
  timestamp: string
  latitude: number
  longitude: number
  exif: Record<string, any>
  additional_metadata: Record<string, any>
}

interface ProcessedDay {
  date: string
  count: number
}

interface Trip {
  start_date: string
  end_date: string
  title: string
}

interface PhotoSummary {
  important_days: ProcessedDay[]
  trips: Trip[]
}

// Mock photos data from the "phone"
const MOCK_PHOTOS: PhotoMetadata[] = [
  {
    timestamp: "2024-03-01T12:00:00",
    latitude: 32.0853,
    longitude: 34.7818, // Tel Aviv
    exif: { "Make": "Apple", "Model": "iPhone 15", "TIFF": "..." },
    additional_metadata: { "category": "nature" }
  },
  {
    timestamp: "2024-03-01T15:00:00",
    latitude: 32.0853,
    longitude: 34.7818,
    exif: { "Make": "Apple" },
    additional_metadata: {}
  },
  {
    timestamp: "2024-02-15T18:30:00",
    latitude: 51.5074,
    longitude: -0.1278, // London
    exif: { "Make": "Canon", "Model": "EOS R5", "TIFF": "..." },
    additional_metadata: { "category": "travel" }
  }
]

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<PhotoSummary | null>(null)
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(true)

  useEffect(() => {
    const processPhotos = async () => {
      try {
        const response = await fetch('http://localhost:8000/process-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(MOCK_PHOTOS),
        })
        if (!response.ok) throw new Error('Failed to process photos')
        const data = await response.json()
        setSummary(data)
      } catch (error) {
        console.error('Error processing photos:', error)
      } finally {
        setIsProcessingPhotos(false)
      }
    }
    processPhotos()
  }, [])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          summary: summary
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()
      const assistantMessage: Message = { role: 'assistant', content: data.response }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = { role: 'assistant', content: 'Sorry, I am having trouble connecting to the server.' }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div id="root">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon"></div>
          mixtiles
        </div>
      </header>

      <div className="chat-container">
        {isProcessingPhotos && (
          <div className="processing-overlay">
            <div className="spinner"></div>
            Analyzing your photos...
          </div>
        )}
        
        <div className="messages">
          {messages.length === 0 && !isProcessingPhotos && (
            <div className="message assistant">
              <strong>mixtiles</strong>
              Hi! I'm your mixtiles assistant. I've analyzed your photos and I'm ready to help you create something beautiful. What's on your mind?
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              <strong>{m.role === 'user' ? 'You' : 'mixtiles'}</strong>
              {m.content}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <strong>mixtiles</strong>
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Tell me about your photos..."
            disabled={isProcessingPhotos}
          />
          <button onClick={sendMessage} disabled={isLoading || isProcessingPhotos}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
