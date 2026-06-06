const RPC = process.env.TATUM_SUI_RPC?.replace(/\/$/, "");
const KEY = process.env.TATUM_API_KEY;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
}

interface JsonRpcSuccess<T> {
  id: number;
  jsonrpc: "2.0";
  result: T;
}

interface JsonRpcError {
  id: number | null;
  jsonrpc: "2.0";
  error: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcError;

let reqId = 1;

function isJsonRpcError<T>(json: JsonRpcResponse<T>): json is JsonRpcError {
  return "error" in json;
}

function getTatumConfig(): { rpc: string; key: string } {
  if (!RPC) throw new Error("Missing TATUM_SUI_RPC env var");
  if (!KEY) throw new Error("Missing TATUM_API_KEY env var");

  return { rpc: RPC, key: KEY };
}

async function suiRpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const { rpc, key } = getTatumConfig();
  const body: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: reqId++,
    method,
    params,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Tatum HTTP ${res.status}: ${text}`);
    }

    const json = (await res.json()) as JsonRpcResponse<T>;

    if (isJsonRpcError(json)) {
      throw new Error(
        `Tatum RPC: ${json.error.message ?? JSON.stringify(json.error)}`,
      );
    }

    return json.result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Tatum RPC error";
    throw new Error(`Tatum ${method} failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getLatestCheckpoint(): Promise<string> {
  return suiRpc<string>("sui_getLatestCheckpointSequenceNumber", []);
}

export async function getSuiObject(objectId: string): Promise<unknown> {
  return suiRpc("sui_getObject", [
    objectId,
    { showContent: true, showOwner: true, showType: true },
  ]);
}

export async function getChainIdentifier(): Promise<string> {
  return suiRpc<string>("sui_getChainIdentifier", []);
}
