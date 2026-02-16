import { put, del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function PATCH(request: NextRequest) {
  try {
    const { metaUrl, metaPathname, title, lastModified } = await request.json()

    if (!metaUrl || (!title && !lastModified)) {
      return NextResponse.json(
        { error: "Missing metaUrl or update fields" },
        { status: 400 }
      )
    }

    // Fetch current metadata
    const res = await fetch(metaUrl)
    const metadata = await res.json()

    // Update fields
    const updatedMetadata = {
      ...metadata,
      ...(title !== undefined && { title }),
      ...(lastModified !== undefined && { lastModified }),
      ...(title !== undefined && !lastModified && { lastModified: new Date().toISOString() }),
    }

    // Delete old metadata blob
    await del(metaUrl)

    // Write updated metadata
    const newMetaBlob = await put(
      metaPathname,
      JSON.stringify(updatedMetadata),
      {
        access: "public",
        contentType: "application/json",
      }
    )

    return NextResponse.json({
      ...updatedMetadata,
      metaUrl: newMetaBlob.url,
      metaPathname: newMetaBlob.pathname,
    })
  } catch (error) {
    console.error("Update error:", error)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}
