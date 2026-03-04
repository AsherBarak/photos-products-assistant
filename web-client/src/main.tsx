import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createMockPhotoService } from './photoService'
import { PhotoServiceContext } from './PhotoServiceContext'

const photoService = createMockPhotoService()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PhotoServiceContext.Provider value={photoService}>
      <App />
    </PhotoServiceContext.Provider>
  </StrictMode>,
)
