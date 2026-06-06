const PUBLISHER = process.env.WALRUS_PUBLISHER!;
const AGGREGATOR = process.env.WALRUS_AGGREGATOR!;

export interface MemoryBlob {
  sessionId: string;
  messages: { role: string; content: string }[];
  timestamp: number;
  metadata: {
    model: string;
    totalMessages: number;
  };
}

function validateEnv() {
  if (!PUBLISHER) throw new Error("Missing WALRUS_PUBLISHER env var");
  if (!AGGREGATOR) throw new Error("Missing WALRUS_AGGREGATOR env var");
}

export async function storeMemory(data: MemoryBlob): Promise<string> {
  validateEnv();
  const body = JSON.stringify(data);

  const res = await fetch(`${PUBLISHER}/v1/blobs?epochs=5`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Walrus store failed [${res.status}]: ${text}`);
  }

  const json = await res.json();

  const blobId =
    json?.newlyCreated?.blobObject?.blobId ??
    json?.alreadyCertified?.blobId ??
    null;

  if (!blobId) {
    throw new Error(`Walrus response missing blobId: ${JSON.stringify(json)}`);
  }

  return blobId;
}

export async function retrieveMemory(blobId: string): Promise<MemoryBlob> {
  validateEnv();

  const res = await fetch(`${AGGREGATOR}/v1/blobs/${blobId}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(
      `Walrus retrieve failed [${res.status}]: ${res.statusText}`
    );
  }

  return res.json() as Promise<MemoryBlob>;
}
