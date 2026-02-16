"use client"

import { useState, useRef, useEffect } from "react"
import { Pencil, Trash2, Check, X, Loader2, Calendar, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface GalleryImage {
  url: string
  title: string
  uploadedAt: string
  lastModified?: string
  pathname: string
  metaUrl: string
  metaPathname: string
}

interface GalleryCardProps {
  image: GalleryImage
  aspectRatio?: number
  onUpdate: (
    metaUrl: string,
    metaPathname: string,
    updates: { title?: string; lastModified?: string }
  ) => Promise<void>
  onDelete: (url: string, metaUrl: string) => Promise<void>
  onClick?: () => void
}

export function GalleryCard({
  image,
  aspectRatio,
  onUpdate,
  onDelete,
  onClick,
}: GalleryCardProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDate, setEditingDate] = useState(false)
  const [title, setTitle] = useState(image.title)
  const todayStr = new Date().toISOString().split("T")[0]
  const [dateValue, setDateValue] = useState(
    image.lastModified ? image.lastModified.split("T")[0] : todayStr
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const hasDate = !!image.lastModified

  useEffect(() => {
    setTitle(image.title)
  }, [image.title])

  useEffect(() => {
    setDateValue(
      image.lastModified
        ? image.lastModified.split("T")[0]
        : new Date().toISOString().split("T")[0]
    )
  }, [image.lastModified])

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [editingTitle])

  useEffect(() => {
    if (editingDate) {
      // Small delay to ensure the input is mounted and has a valid value
      const timeout = setTimeout(() => {
        dateInputRef.current?.focus()
        try {
          dateInputRef.current?.showPicker?.()
        } catch {
          // showPicker may not be supported in some browsers
        }
      }, 50)
      return () => clearTimeout(timeout)
    }
  }, [editingDate])

  const handleSaveTitle = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      await onUpdate(image.metaUrl, image.metaPathname, {
        title: title.trim(),
      })
      setEditingTitle(false)
    } catch {
      setTitle(image.title)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDate = async () => {
    const val = dateValue || new Date().toISOString().split("T")[0]
    const parsed = new Date(val + "T12:00:00")
    if (isNaN(parsed.getTime())) return
    setSaving(true)
    try {
      await onUpdate(image.metaUrl, image.metaPathname, {
        lastModified: parsed.toISOString(),
      })
      setEditingDate(false)
    } catch {
      setDateValue(
        image.lastModified
          ? image.lastModified.split("T")[0]
          : new Date().toISOString().split("T")[0]
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCancelTitle = () => {
    setTitle(image.title)
    setEditingTitle(false)
  }

  const handleCancelDate = () => {
    setDateValue(
      image.lastModified
        ? image.lastModified.split("T")[0]
        : new Date().toISOString().split("T")[0]
    )
    setEditingDate(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(image.url, image.metaUrl)
    } catch {
      setDeleting(false)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveTitle()
    if (e.key === "Escape") handleCancelTitle()
  }

  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveDate()
    if (e.key === "Escape") handleCancelDate()
  }

  const formattedDate = image.lastModified
    ? new Date(image.lastModified).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card transition-all duration-300",
        !hasDate && "border-amber-500/40",
        deleting && "scale-95 opacity-50"
      )}
    >
      {/* Image with floating trash icon */}
      <div
        className="relative w-full overflow-hidden"
        style={aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
      >
        {!loaded && (
          <div
            className="flex w-full items-center justify-center bg-secondary"
            style={
              aspectRatio
                ? { aspectRatio: `${aspectRatio}` }
                : { aspectRatio: "1" }
            }
          >
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <img
          src={image.url}
          alt={image.title}
          className={cn(
            "w-full cursor-pointer object-cover transition-transform duration-500 group-hover:scale-[1.02]",
            !loaded && "absolute inset-0 opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          onClick={onClick}
          loading="lazy"
        />

        {/* Missing-date badge on image */}
        {!hasDate && loaded && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[11px] font-medium text-background shadow-sm">
            <AlertCircle className="h-3 w-3" />
            <span>No date</span>
          </div>
        )}

        {/* Floating delete button on image */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-foreground opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
          aria-label="Delete image"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Info section below image */}
      <div className="flex flex-col gap-1.5 p-3">
        {/* Title row */}
        {editingTitle ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Enter a title..."
              disabled={saving}
            />
            <button
              type="button"
              onClick={handleSaveTitle}
              disabled={saving || !title.trim()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              aria-label="Save title"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelTitle}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
              aria-label="Cancel editing"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <h3
              className="flex-1 text-sm font-medium leading-relaxed text-foreground"
              title={image.title}
            >
              {image.title}
            </h3>
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus:opacity-100"
              aria-label="Edit title"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Date row */}
        {editingDate ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={dateInputRef}
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              onKeyDown={handleDateKeyDown}
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary [color-scheme:dark]"
              disabled={saving}
            />
            <button
              type="button"
              onClick={handleSaveDate}
              disabled={saving || !dateValue}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              aria-label="Save date"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelDate}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
              aria-label="Cancel date editing"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {hasDate ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formattedDate}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDateValue(new Date().toISOString().split("T")[0])
                  setEditingDate(true)
                }}
                className="flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/10"
              >
                <AlertCircle className="h-3 w-3" />
                <span>Add a date</span>
              </button>
            )}
            {hasDate && (
              <button
                type="button"
                onClick={() => setEditingDate(true)}
                className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-all duration-200 hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                aria-label="Edit date"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
