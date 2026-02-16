"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GalleryHeaderProps {
  onUploadClick: () => void
}

export function GalleryHeader({ onUploadClick }: GalleryHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-8 py-6 sm:px-12 md:px-16 lg:px-20 xl:px-28 2xl:px-36">
        <h1 className="font-gothic text-5xl uppercase tracking-wider text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
          dvanw test
        </h1>
        <Button onClick={onUploadClick} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
      </div>
    </header>
  )
}
