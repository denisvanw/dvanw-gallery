import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const dateStr = formData.get("date") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const blob = await put(`gallery/${Date.now()}-${file.name}`, file, {
      access: "public",
    })

    // Store metadata as a JSON blob alongside the image
    const now = new Date().toISOString()
    const lastModified = dateStr
      ? new Date(dateStr + "T12:00:00").toISOString()
      : now
    const metadata = {
      url: blob.url,
      title: title || file.name.replace(/\.[^/.]+$/, ""),
      uploadedAt: now,
      lastModified,
      pathname: blob.pathname,
    }

    const metaBlob = await put(
      `gallery-meta/${Date.now()}-${file.name}.json`,
      JSON.stringify(metadata),
      {
        access: "public",
        contentType: "application/json",
      }
    )

    return NextResponse.json({
      ...metadata,
      metaUrl: metaBlob.url,
      metaPathname: metaBlob.pathname,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
