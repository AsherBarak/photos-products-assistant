import { readdir, readFile, writeFile } from 'fs/promises'
import { join, extname, basename } from 'path'

interface PhotoIndexEntry {
  id: string
  timestamp: string
  latitude: number
  longitude: number
  exif: Record<string, any>
}

const PHOTOS_DIR = join(import.meta.dirname, '../../photos-export')
const OUTPUT_PATH = join(import.meta.dirname, '../public/photo-index.json')
const IMAGE_EXTENSIONS = new Set(['.heic', '.jpg', '.jpeg', '.png'])

function parseExifDate(dateStr: string, offset?: string): string {
  // "2020:03:02 19:38:14" → "2020-03-02T19:38:14+00:00"
  const iso = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T')
  return iso + (offset || '+00:00')
}

function parseGps(value: number | undefined): number {
  if (value === undefined) return 0
  return value
}

async function walkDir(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkDir(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

async function main() {
  const allFiles = await walkDir(PHOTOS_DIR)
  const imageFiles = allFiles.filter(f => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()))

  console.log(`Found ${imageFiles.length} image files`)

  const entries: PhotoIndexEntry[] = []
  let skipped = 0

  for (const imagePath of imageFiles) {
    const sidecarPath = imagePath + '.json'
    try {
      const raw = await readFile(sidecarPath, 'utf-8')
      const [exif] = JSON.parse(raw)

      if (!exif['EXIF:DateTimeOriginal']) {
        skipped++
        continue
      }

      entries.push({
        id: basename(imagePath),
        timestamp: parseExifDate(exif['EXIF:DateTimeOriginal'], exif['EXIF:OffsetTimeOriginal']),
        latitude: parseGps(exif['EXIF:GPSLatitude']),
        longitude: parseGps(exif['EXIF:GPSLongitude']),
        exif: {
          Make: exif['EXIF:Make'],
          Model: exif['EXIF:Model'],
          CreateDate: exif['EXIF:CreateDate'],
        },
      })
    } catch {
      skipped++
    }
  }

  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

  await writeFile(OUTPUT_PATH, JSON.stringify(entries, null, 2))
  console.log(`Wrote ${entries.length} entries to photo-index.json (skipped ${skipped})`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
