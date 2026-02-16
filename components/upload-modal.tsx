"use client"

import { useState, useCallback, useRef } from "react"
import { Upload, X, ImagePlus, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

interface FilePreview {
  file: File
  preview: string
  title: string
}

export function UploadModal({ open, onOpenChange, onUploadComplete }: UploadModalProps) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split("T")[0])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: FilePreview[] = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        title: file.name.replace(/\.[^/.]+$/, ""),
      }))
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragActive(false)
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const updateTitle = (index: number, title: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, title } : f))
    )
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)

    try {
      for (const filePreview of files) {
        const formData = new FormData()
        formData.append("file", filePreview.file)
        formData.append("title", filePreview.title)
        if (batchDate) {
          formData.append("date", batchDate)
        }
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
      }
      files.forEach((f) => URL.revokeObjectURL(f.preview))
      setFiles([])
      onUploadComplete()
      onOpenChange(false)
    } catch (error) {
      console.error("Upload failed:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      files.forEach((f) => URL.revokeObjectURL(f.preview))
      setFiles([])
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl border-border bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Upload Images</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Drag and drop images or click to browse. Add titles before uploading.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <ImagePlus className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drop images here or click to browse
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
            }}
          />
        </div>

        {/* Batch date picker */}
        {files.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg bg-secondary/60 px-4 py-3">
            <label htmlFor="batch-date" className="whitespace-nowrap text-sm font-medium text-foreground">
              Date for all pictures
            </label>
            <input
              id="batch-date"
              type="date"
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}

        {/* File previews */}
        {files.length > 0 && (
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {files.map((filePreview, index) => (
              <div
                key={`${filePreview.file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg bg-secondary p-3"
              >
                <img
                  src={filePreview.preview}
                  alt={filePreview.title}
                  className="h-14 w-14 rounded object-cover"
                />
                <Input
                  value={filePreview.title}
                  onChange={(e) => updateTitle(index, e.target.value)}
                  placeholder="Image title..."
                  className="flex-1 border-border bg-background text-foreground"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={uploading}
            className="border-border text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload {files.length > 0 ? `(${files.length})` : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
