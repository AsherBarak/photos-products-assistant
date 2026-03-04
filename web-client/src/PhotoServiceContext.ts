import { createContext, useContext } from 'react'
import type { PhotoService } from './photoService'

export const PhotoServiceContext = createContext<PhotoService | null>(null)

export function usePhotoService(): PhotoService {
  const service = useContext(PhotoServiceContext)
  if (!service) throw new Error('usePhotoService must be used within a PhotoServiceContext.Provider')
  return service
}
