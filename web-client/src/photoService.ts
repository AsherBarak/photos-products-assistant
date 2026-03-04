export interface PhotoMetadata {
  id: string
  timestamp: string
  latitude: number
  longitude: number
  exif: Record<string, any>
  additional_metadata: Record<string, any>
}

export interface PhotoEmbedding {
  photo_id: string
  clip_embedding: number[]
  face_embedding: number[]
  faces_detected: number
}

export interface PhotoService {
  fetchAllPhotos(): Promise<PhotoMetadata[]>
  fetchEmbedding(photoId: string): Promise<PhotoEmbedding>
}

// --- Mock implementation ---

const MOCK_PHOTO_COUNT = 2500

const LOCATIONS = {
  TEL_AVIV: { lat: 32.0622, lon: 34.7711 },
  TEHRAN: { lat: 35.6892, lon: 51.3890 },
  GREECE: { lat: 37.9838, lon: 23.7275 },
}

class MockPhotoService implements PhotoService {
  private cachedPhotos: PhotoMetadata[] | null = null

  async fetchAllPhotos(): Promise<PhotoMetadata[]> {
    if (this.cachedPhotos) return this.cachedPhotos

    const photos: PhotoMetadata[] = []
    const now = new Date()
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)

    for (let i = 0; i < MOCK_PHOTO_COUNT; i++) {
      const randomTime = new Date(twoYearsAgo.getTime() + Math.random() * (now.getTime() - twoYearsAgo.getTime()))
      let loc = LOCATIONS.TEL_AVIV
      if (i < 125) loc = LOCATIONS.TEHRAN
      else if (i < 250) loc = LOCATIONS.GREECE

      photos.push({
        id: `photo-${i}`,
        timestamp: randomTime.toISOString(),
        latitude: loc.lat + (Math.random() - 0.5) * 0.01,
        longitude: loc.lon + (Math.random() - 0.5) * 0.01,
        exif: { Make: 'Apple', Model: 'iPhone' },
        additional_metadata: {},
      })
    }

    this.cachedPhotos = photos
    return photos
  }

  async fetchEmbedding(photoId: string): Promise<PhotoEmbedding> {
    return {
      photo_id: photoId,
      clip_embedding: Array.from({ length: 512 }, () => Math.random() * 2 - 1),
      face_embedding: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
      faces_detected: Math.floor(Math.random() * 4),
    }
  }
}

export function createMockPhotoService(): PhotoService {
  return new MockPhotoService()
}
