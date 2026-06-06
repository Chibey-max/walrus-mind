import { NextRequest, NextResponse } from "next/server";
import { chat, ChatMessage } from "@/lib/llm";
import { storeMemory, retrieveMemory, MemoryBlob } from "@/lib/walrus";
import { getLatestCheckpoint, getSuiNetworkStats } from "@/lib/tatum";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ChatRequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  sessionId: string;
  blobId?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { messages, sessionId, blobId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "ERR: messages array required" }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: "ERR: sessionId required" }, { status: 400 });
    }

    // Step 1 — Load prior memory from Walrus
    let history: ChatMessage[] = messages;
    if (blobId) {
      try {
        const memory = await retrieveMemory(blobId);
        const stored = memory.messages.filter(
          (m) => m.role === "user" || m.role === "assistant"
        ) as ChatMessage[];
        history = [...stored, ...messages].slice(-20);
      } catch (err) {
        console.warn("[walrus] retrieve skipped:", err);
      }
    }

    // Step 2 — Get AI response
    const reply = await chat(history);

    // Step 3 — Build updated memory
    const updatedMessages: ChatMessage[] = [
      ...history,
      { role: "assistant", content: reply },
    ];

    // Step 4 — Store on Walrus
    const memBlob: MemoryBlob = {
      sessionId,
      messages: updatedMessages,
      timestamp: Date.now(),
      metadata: {
        model: "llama-3.3-70b-versatile",
        totalMessages: updatedMessages.length,
      },
    };
    const newBlobId = await storeMemory(memBlob);

    // Step 5 — Sui checkpoint + network stats via Tatum (non-fatal if it fails)
    let checkpoint: string | null = null;
    let networkStats: Record<string, unknown> | null = null;
    try {
      [checkpoint, networkStats] = await Promise.all([
        getLatestCheckpoint(),
        getSuiNetworkStats(),
      ]);
    } catch (err) {
      console.warn("[tatum] stats skipped:", err);
    }

    return NextResponse.json({ reply, blobId: newBlobId, checkpoint, networkStats });
  } catch (err) {
    console.error("[chat] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `ERR: ${message}` }, { status: 500 });
  }
}
