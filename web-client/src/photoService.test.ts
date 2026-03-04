import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocalPhotoService } from './photoService'

const SAMPLE_INDEX = [
  {
    id: 'IMG_1236.HEIC',
    timestamp: '2020-03-02T19:38:14+00:00',
    latitude: 51.59576333,
    longitude: -0.1665555,
    exif: { Make: 'Apple', Model: 'iPhone 11', CreateDate: '2020:03:02 19:38:14' },
  },
  {
    id: 'IMG_2000.HEIC',
    timestamp: '2020-03-15T10:00:00+02:00',
    latitude: 0,
    longitude: 0,
    exif: { Make: 'Apple', Model: 'iPhone 11' },
  },
]

describe('LocalPhotoService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetchAllPhotos fetches and maps photo-index.json', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_INDEX),
    })

    const service = createLocalPhotoService()
    const photos = await service.fetchAllPhotos()

    expect(global.fetch).toHaveBeenCalledWith('/photo-index.json')
    expect(photos).toHaveLength(2)
    expect(photos[0]).toEqual({
      id: 'IMG_1236.HEIC',
      timestamp: '2020-03-02T19:38:14+00:00',
      latitude: 51.59576333,
      longitude: -0.1665555,
      exif: { Make: 'Apple', Model: 'iPhone 11', CreateDate: '2020:03:02 19:38:14' },
      additional_metadata: {},
    })
  })

  it('fetchAllPhotos caches results', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(SAMPLE_INDEX),
    })

    const service = createLocalPhotoService()
    await service.fetchAllPhotos()
    await service.fetchAllPhotos()

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('fetchAllPhotos throws on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })

    const service = createLocalPhotoService()
    await expect(service.fetchAllPhotos()).rejects.toThrow('Failed to fetch photo index: 404')
  })

  it('fetchEmbedding returns random embeddings', async () => {
    const service = createLocalPhotoService()
    const embedding = await service.fetchEmbedding('IMG_1236.HEIC')

    expect(embedding.photo_id).toBe('IMG_1236.HEIC')
    expect(embedding.clip_embedding).toHaveLength(512)
    expect(embedding.face_embedding).toHaveLength(128)
    expect(typeof embedding.faces_detected).toBe('number')
  })
})
