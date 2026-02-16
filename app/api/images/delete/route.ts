import { del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { url, metaUrl } = await request.json()

    if (!url || !metaUrl) {
      return NextResponse.json(
        { error: "Missing url or metaUrl" },
        { status: 400 }
      )
    }

    await del(url)
    await del(metaUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
