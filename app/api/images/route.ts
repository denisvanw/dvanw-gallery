import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface ImageMeta {
  url: string
  title: string
  uploadedAt: string
  lastModified?: string
  pathname: string
  metaUrl: string
  metaPathname: string
}

// In-memory cache to avoid re-fetching all blobs on every paginated request
let cachedImages: ImageMeta[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5000 // 5 seconds

async function getAllImagesSorted(): Promise<ImageMeta[]> {
  const now = Date.now()
  if (cachedImages && now - cacheTimestamp < CACHE_TTL) {
    return cachedImages
  }

  // Fetch ALL metadata blobs (no pagination at the blob level)
  const allBlobs: { url: string; pathname: string }[] = []
  let cursor: string | undefined = undefined
  let hasMore = true

  while (hasMore) {
    const result = await list({
      prefix: "gallery-meta/",
      limit: 1000,
      cursor,
    })
    allBlobs.push(...result.blobs)
    hasMore = result.hasMore
    cursor = result.cursor
  }

  // Fetch all metadata in parallel
  const images = await Promise.all(
    allBlobs.map(async (blob) => {
      try {
        const res = await fetch(blob.url)
        if (!res.ok) return null
        const metadata = await res.json()
        return {
          ...metadata,
          metaUrl: blob.url,
          metaPathname: blob.pathname,
        } as ImageMeta
      } catch {
        return null
      }
    })
  )

  // Filter and sort globally: no-date first, then reverse chronological
  const validImages = images.filter((img): img is ImageMeta => !!img && !!img.url)
  validImages.sort((a, b) => {
    const aHasDate = !!a.lastModified
    const bHasDate = !!b.lastModified
    if (!aHasDate && bHasDate) return -1
    if (aHasDate && !bHasDate) return 1
    if (!aHasDate && !bHasDate) {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    }
    return new Date(b.lastModified!).getTime() - new Date(a.lastModified!).getTime()
  })

  cachedImages = validImages
  cacheTimestamp = now
  return validImages
}

// Invalidate cache (called after uploads/updates/deletes via query param)
export function invalidateCache() {
  cachedImages = null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "0", 10)
    const limit = 20

    // Invalidate cache if requested
    if (searchParams.get("fresh") === "1") {
      cachedImages = null
    }

    const allImages = await getAllImagesSorted()

    const start = page * limit
    const end = start + limit
    const pageImages = allImages.slice(start, end)
    const hasMore = end < allImages.length

    return NextResponse.json({
      images: pageImages,
      hasMore,
      page,
    })
  } catch (error) {
    console.error("Error listing images:", error)
    return NextResponse.json({ error: "Failed to list images" }, { status: 500 })
  }
}
