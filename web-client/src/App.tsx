import { useState, useEffect, useRef } from 'react'
import './App.css'
import { usePhotoService } from './PhotoServiceContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
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
  time_range?: { start_date: string; end_date: string }
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

const EMBED_BATCH_SIZE = 200

const createInitialDataReadiness = (): DataReadiness => ({
  metadata: 'pending',
  clip_embeddings: { total: 0, ready: 0, in_scope: 0, in_scope_ready: 0 },
  face_embeddings: { total: 0, ready: 0, in_scope: 0, in_scope_ready: 0 },
})

const DEBUG_MODE = new URLSearchParams(window.location.search).has('debug')

function App() {
  const photoService = usePhotoService()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<PhotoSummary | null>(null)
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false)
  const [picker, setPicker] = useState<Picker | null>(null)
  const [scope, setScope] = useState<Scope | null>(null)
  const [dataReadiness, setDataReadiness] = useState<DataReadiness>(createInitialDataReadiness)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, picker])

  useEffect(() => {
    const loadPhotosAndEmbed = async () => {
      setIsProcessingPhotos(true)

      try {
        // 1. Fetch all photo metadata
        const photos = await photoService.fetchAllPhotos()
        const total = photos.length

        setDataReadiness(prev => ({
          ...prev,
          clip_embeddings: { ...prev.clip_embeddings, total },
          face_embeddings: { ...prev.face_embeddings, total },
        }))

        // 2. Process photos for summary (server)
        const response = await fetch('http://localhost:8000/process-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photos),
        })
        if (!response.ok) throw new Error('Failed to process photos')
        const data = await response.json()
        setSummary(data)
        setDataReadiness(prev => ({ ...prev, metadata: 'complete' }))

        // 3. Fetch embeddings in batches
        for (let i = 0; i < photos.length; i += EMBED_BATCH_SIZE) {
          const batch = photos.slice(i, i + EMBED_BATCH_SIZE)
          await Promise.all(batch.map(p => photoService.fetchEmbedding(p.id)))
          const ready = Math.min(i + EMBED_BATCH_SIZE, photos.length)
          setDataReadiness(prev => ({
            ...prev,
            clip_embeddings: { ...prev.clip_embeddings, ready },
            face_embeddings: { ...prev.face_embeddings, ready },
          }))
        }
      } catch (error) {
        console.error('Error loading photos:', error)
      } finally {
        setIsProcessingPhotos(false)
      }
    }
    loadPhotosAndEmbed()
  }, [photoService])

  // When scope changes, update in_scope counts proportionally
  useEffect(() => {
    setDataReadiness(prev => {
      const total = prev.clip_embeddings.total
      if (total === 0) return prev
      const hasScope = scope && Object.keys(scope).some(k => (scope as any)[k] != null)
      const scopeRatio = hasScope ? 0.34 : 1.0
      const inScope = Math.round(total * scopeRatio)
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

      {DEBUG_MODE && (
          <div className="debug-overlay">
            <strong>scope</strong>
            <pre>{scope ? JSON.stringify(scope, null, 2) : 'null'}</pre>
            <strong>readiness</strong>
            <pre>{JSON.stringify({
              meta: dataReadiness.metadata,
              clip: `${dataReadiness.clip_embeddings.ready}/${dataReadiness.clip_embeddings.total}`,
              face: `${dataReadiness.face_embeddings.ready}/${dataReadiness.face_embeddings.total}`,
            }, null, 2)}</pre>
          </div>
        )}

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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display: 'block'}}>
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
