import { useState, useEffect, useRef } from 'react'
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

interface Scope {
  time_range?: { start: string; end: string }
  trip?: string
  people?: string[]
  themes?: string[]
  product_type?: string
}

interface EmbeddingReadiness {
  total: number
  ready: number
  in_scope: number
  in_scope_ready: number
}

interface DataReadiness {
  metadata: 'pending' | 'complete'
  clip_embeddings: EmbeddingReadiness
  face_embeddings: EmbeddingReadiness
}

interface PickerOption {
  id: string
  label: string
  image_url?: string
}

interface Picker {
  type: 'text' | 'image'
  options: PickerOption[]
}

const MOCK_PHOTO_COUNT = 2500

const createInitialDataReadiness = (): DataReadiness => ({
  metadata: 'pending',
  clip_embeddings: { total: MOCK_PHOTO_COUNT, ready: 0, in_scope: 0, in_scope_ready: 0 },
  face_embeddings: { total: MOCK_PHOTO_COUNT, ready: 0, in_scope: 0, in_scope_ready: 0 },
})

// Mock photos data generator
const generateMockPhotos = (): PhotoMetadata[] => {
  const photos: PhotoMetadata[] = []
  const now = new Date()
  const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
  
  // Locations
  const LOCATIONS = {
    TEL_AVIV: { lat: 32.0622, lon: 34.7711 }, // Lilienblum 7
    TEHRAN: { lat: 35.6892, lon: 51.3890 },
    GREECE: { lat: 37.9838, lon: 23.7275 }, // Athens
  }

  for (let i = 0; i < 2500; i++) {
    const randomTime = new Date(twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime()))
    let loc = LOCATIONS.TEL_AVIV
    
    // Distribute some trips
    if (i < 125) loc = LOCATIONS.TEHRAN // 5%
    else if (i < 250) loc = LOCATIONS.GREECE // 5%
    
    photos.push({
      timestamp: randomTime.toISOString(),
      latitude: loc.lat + (Math.random() - 0.5) * 0.01,
      longitude: loc.lon + (Math.random() - 0.5) * 0.01,
      exif: { "Make": "Apple", "Model": "iPhone" },
      additional_metadata: {}
    })
  }
  return photos
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<PhotoSummary | null>(null)
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false)
  const [picker, setPicker] = useState<Picker | null>(null)
  const [scope, setScope] = useState<Scope | null>(null)
  const [dataReadiness, setDataReadiness] = useState<DataReadiness>(createInitialDataReadiness)
  const messagesRef = useRef<HTMLDivElement>(null)
  const embeddingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, picker])

  useEffect(() => {
    const collectAndProcessPhotos = async () => {
      setIsProcessingPhotos(true)
      
      // Simulate data collection stall (zero in tests)
      const delay = (window as any).IS_TEST ? 0 : 5000
      await new Promise(resolve => setTimeout(resolve, delay))
      
      const mockPhotos = generateMockPhotos()
      
      try {
        const response = await fetch('http://localhost:8000/process-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockPhotos),
        })
        if (!response.ok) throw new Error('Failed to process photos')
        const data = await response.json()
        setSummary(data)

        // Metadata is now complete
        setDataReadiness(prev => ({ ...prev, metadata: 'complete' }))

        // Simulate embeddings gradually becoming ready
        const isTest = (window as any).IS_TEST
        if (isTest) {
          // In tests, immediately set embeddings to a reasonable state
          setDataReadiness(prev => ({
            ...prev,
            clip_embeddings: { ...prev.clip_embeddings, ready: Math.round(MOCK_PHOTO_COUNT * 0.6) },
            face_embeddings: { ...prev.face_embeddings, ready: Math.round(MOCK_PHOTO_COUNT * 0.4) },
          }))
        } else {
          // In real usage, simulate gradual embedding processing
          const interval = setInterval(() => {
            setDataReadiness(prev => {
              const clipReady = Math.min(prev.clip_embeddings.total, prev.clip_embeddings.ready + Math.round(MOCK_PHOTO_COUNT * 0.08))
              const faceReady = Math.min(prev.face_embeddings.total, prev.face_embeddings.ready + Math.round(MOCK_PHOTO_COUNT * 0.05))
              const clipDone = clipReady >= prev.clip_embeddings.total
              const faceDone = faceReady >= prev.face_embeddings.total
              if (clipDone && faceDone) clearInterval(interval)
              return {
                ...prev,
                clip_embeddings: { ...prev.clip_embeddings, ready: clipReady },
                face_embeddings: { ...prev.face_embeddings, ready: faceReady },
              }
            })
          }, 3000)
          embeddingTimerRef.current = interval
        }
      } catch (error) {
        console.error('Error processing photos:', error)
      } finally {
        setIsProcessingPhotos(false)
      }
    }
    collectAndProcessPhotos()
  }, [])

  // Cleanup embedding timer on unmount
  useEffect(() => {
    return () => {
      if (embeddingTimerRef.current) clearInterval(embeddingTimerRef.current)
    }
  }, [])

  // When scope changes, update in_scope counts proportionally
  useEffect(() => {
    setDataReadiness(prev => {
      // Estimate how many photos are in scope based on scope fields
      // With no scope, all photos are in scope; with scope, roughly 30-40%
      const hasScope = scope && Object.keys(scope).some(k => (scope as any)[k] != null)
      const scopeRatio = hasScope ? 0.34 : 1.0
      const inScope = Math.round(MOCK_PHOTO_COUNT * scopeRatio)
      const clipInScopeReady = Math.min(inScope, Math.round(prev.clip_embeddings.ready * scopeRatio))
      const faceInScopeReady = Math.min(inScope, Math.round(prev.face_embeddings.ready * scopeRatio))
      return {
        ...prev,
        clip_embeddings: { ...prev.clip_embeddings, in_scope: inScope, in_scope_ready: clipInScopeReady },
        face_embeddings: { ...prev.face_embeddings, in_scope: inScope, in_scope_ready: faceInScopeReady },
      }
    })
  }, [scope])

  const sendMessage = async (overrideInput?: string) => {
    const textToSend = typeof overrideInput === 'string' ? overrideInput : input
    if (!textToSend || !textToSend.trim()) return

    const userMessage: Message = { role: 'user', content: textToSend.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setPicker(null) // Slide down on send
    setIsLoading(true)

    console.log('Sending message:', textToSend)
    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          summary: summary,
          scope: scope,
          data_readiness: dataReadiness,
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch')

      const data = await response.json()
      const assistantMessage: Message = { role: 'assistant', content: data.response }
      setMessages((prev) => [...prev, assistantMessage])

      if (data.picker) {
        setPicker(data.picker)
      }

      if (data.scope) {
        setScope(data.scope)
      }
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
          MIXTILES
        </div>
      </header>

      <div className="chat-container">
        {isProcessingPhotos && (
          <div className="background-processing">
            <div className="spinner small"></div>
            Analyzing your photos in the background...
          </div>
        )}
        
        <div className="messages" ref={messagesRef}>
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

        {picker && (
          <div className="picker-container slide-up">
            <div className={`picker-options ${picker.type}`}>
              {picker.options.map((option) => (
                <button 
                  key={option.id} 
                  className="picker-option"
                  onClick={() => sendMessage(option.label)}
                >
                  {option.image_url && <img src={option.image_url} alt={option.label} />}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Tell me about your photos..."
          />
          <button onClick={sendMessage} disabled={isLoading}>
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
