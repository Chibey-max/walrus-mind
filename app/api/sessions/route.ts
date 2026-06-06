import { NextResponse } from "next/server";

export const runtime = "nodejs";

export interface SessionSummary {
  blobId: string;
  sessionId: string;
  timestamp: number;
}

interface SessionsResponseBody {
  sessions: SessionSummary[];
  note: string;
}

export async function GET(): Promise<NextResponse<SessionsResponseBody>> {
  return NextResponse.json({
    sessions: [],
    note: "Session history is stored in the browser via localStorage. Use the client SessionList component to view saved blobIds.",
  });
}
