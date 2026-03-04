import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createLocalPhotoService } from './photoService'
import { PhotoServiceContext } from './PhotoServiceContext'

const photoService = createLocalPhotoService()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PhotoServiceContext.Provider value={photoService}>
      <App />
    </PhotoServiceContext.Provider>
  </StrictMode>,
)
