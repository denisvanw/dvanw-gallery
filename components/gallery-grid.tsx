"use client"

import { useRef, useEffect, useCallback, useState, useMemo } from "react"
import useSWRInfinite from "swr/infinite"
import { GalleryCard, type GalleryImage } from "@/components/gallery-card"
import { Lightbox } from "@/components/lightbox"
import { Loader2 } from "lucide-react"

interface ImagesResponse {
  images: GalleryImage[]
  hasMore: boolean
  page: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getKey(pageIndex: number, previousPageData: ImagesResponse | null) {
  if (previousPageData && !previousPageData.hasMore) return null
  return `/api/images?page=${pageIndex}&fresh=${pageIndex === 0 ? "1" : "0"}`
}

/** Probe the natural width/height of an image URL */
function loadImageDimensions(
  url: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 1, height: 1 })
    img.src = url
  })
}

export function GalleryGrid({ refreshKey }: { refreshKey: number }) {
  const { data, size, setSize, isLoading, mutate } =
    useSWRInfinite<ImagesResponse>(getKey, fetcher, {
      revalidateFirstPage: true,
    })
  const sentinelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [columns, setColumns] = useState(4)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Responsive column count based on container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateColumns = () => {
      const w = el.offsetWidth
      if (w < 480) setColumns(1)
      else if (w < 768) setColumns(2)
      else if (w < 1024) setColumns(3)
      else setColumns(4)
    }

    updateColumns()

    const observer = new ResizeObserver(() => updateColumns())
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Revalidate when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      mutate()
    }
  }, [refreshKey, mutate])

  const images = data
    ? data
        .filter(
          (page): page is ImagesResponse =>
            !!page && Array.isArray(page.images)
        )
        .flatMap((page) => page.images)
        .filter((img): img is GalleryImage => !!img && !!img.url)
    : []
  const isLoadingMore =
    size > 0 && data && typeof data[size - 1] === "undefined"
  const lastPage = data && data.length > 0 ? data[data.length - 1] : null
  const hasMore = lastPage?.hasMore ?? false

  // Probe dimensions for any new images we haven't measured yet
  useEffect(() => {
    const unmeasured = images.filter(
      (img) => img?.url && !dimensions[img.url]
    )
    if (unmeasured.length === 0) return

    let cancelled = false
    Promise.all(
      unmeasured.map(async (img) => {
        const dims = await loadImageDimensions(img.url)
        return { url: img.url, dims }
      })
    ).then((results) => {
      if (cancelled) return
      setDimensions((prev) => {
        const next = { ...prev }
        for (const r of results) {
          next[r.url] = r.dims
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  // Infinite scroll observer
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (
        entries[0]?.isIntersecting &&
        hasMore &&
        !isLoadingMore &&
        !isLoading
      ) {
        setSize((s) => s + 1)
      }
    },
    [hasMore, isLoadingMore, isLoading, setSize]
  )

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "400px",
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [handleIntersect])

  const handleUpdate = async (
    metaUrl: string,
    metaPathname: string,
    updates: { title?: string; lastModified?: string }
  ) => {
    await fetch("/api/images/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaUrl, metaPathname, ...updates }),
    })
    mutate()
  }

  const handleDelete = async (url: string, metaUrl: string) => {
    await fetch("/api/images/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, metaUrl }),
    })
    mutate()
  }

  // Precompute aspect ratios
  const aspectRatios = useMemo(() => {
    const map: Record<string, number | undefined> = {}
    for (const img of images) {
      if (!img?.url) continue
      const d = dimensions[img.url]
      map[img.url] = d ? d.width / d.height : undefined
    }
    return map
  }, [images, dimensions])

  // Distribute images into columns using shortest-column-first approach.
  // This preserves the sort order visually: each next image goes into
  // whichever column is currently the shortest (left-to-right, top-to-bottom feel).
  const columnArrays = useMemo(() => {
    const cols: GalleryImage[][] = Array.from({ length: columns }, () => [])
    const heights = new Array(columns).fill(0)

    for (const img of images) {
      if (!img?.url || !img?.metaUrl) continue
      // Find the shortest column
      let minIdx = 0
      for (let c = 1; c < columns; c++) {
        if (heights[c] < heights[minIdx]) minIdx = c
      }
      cols[minIdx].push(img)
      // Add estimated height (1/aspectRatio, or 1 if unknown) + card padding
      const ar = aspectRatios[img.url]
      heights[minIdx] += ar ? 1 / ar : 1
      heights[minIdx] += 0.15 // approximate card padding/title height
    }

    return cols
  }, [images, columns, aspectRatios])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isLoading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-full bg-secondary p-6">
          <svg
            className="h-10 w-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-foreground">No images yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload some images to get started
        </p>
      </div>
    )
  }

  return (
    <>
      <div ref={containerRef} className="flex w-full gap-4">
        {columnArrays.map((col, colIdx) => (
          <div key={colIdx} className="min-w-0 flex-1 space-y-4">
            {col.map((image) => {
              const globalIndex = images.findIndex(
                (img) => img.metaUrl === image.metaUrl
              )
              return (
                <GalleryCard
                  key={image.metaUrl}
                  image={image}
                  aspectRatio={aspectRatios[image.url]}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onClick={() => setLightboxIndex(globalIndex)}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div ref={sentinelRef} className="h-4" />
      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={(idx) => setLightboxIndex(idx)}
        />
      )}
    </>
  )
}
