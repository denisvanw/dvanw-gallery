"use client"

import { useState } from "react"
import { GalleryHeader } from "@/components/gallery-header"
import { GalleryGrid } from "@/components/gallery-grid"
import { UploadModal } from "@/components/upload-modal"

export default function Home() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <main className="min-h-screen bg-background">
      <GalleryHeader onUploadClick={() => setUploadOpen(true)} />

      <div className="w-full px-8 py-6 sm:px-12 md:px-16 lg:px-20 xl:px-28 2xl:px-36">
        <GalleryGrid refreshKey={refreshKey} />
      </div>

      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={() => setRefreshKey((k) => k + 1)}
      />
    </main>
  )
}
