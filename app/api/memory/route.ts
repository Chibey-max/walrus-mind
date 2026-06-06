import { NextRequest, NextResponse } from "next/server";
import { retrieveMemory } from "@/lib/walrus";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const blobId = req.nextUrl.searchParams.get("blobId");

  if (!blobId) {
    return NextResponse.json(
      { error: "ERR: blobId query param required" },
      { status: 400 }
    );
  }

  try {
    const memory = await retrieveMemory(blobId);
    return NextResponse.json(memory);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `ERR: ${message}` }, { status: 500 });
  }
}
