# 🧠 WALRUS/MIND

> **Decentralized AI memory on Sui — every conversation stored as a Walrus blob, anchored to live Sui state via Tatum RPC.**

Built for the **[Tatum × Walrus Hackathon](https://tatum.io/tatum-x-walrus-hackathon)** · May 23 – June 6, 2026

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?style=flat-square)](https://walrus-mind.vercel.app)
[![Tatum](https://img.shields.io/badge/Powered%20by-Tatum%20RPC-6c47ff?style=flat-square)](https://tatum.io)
[![Walrus](https://img.shields.io/badge/Storage-Walrus%20Protocol-00e5b8?style=flat-square)](https://walrus.space)
[![Sui](https://img.shields.io/badge/Network-Sui%20Testnet-4da2ff?style=flat-square)](https://sui.io)

---

## What It Does

Walrus Mind is a cyberpunk AI chat agent that stores its entire conversation memory as **JSON blobs on Walrus Protocol**, a decentralized storage network built on Sui. Every reply:

1. Calls **Groq LLM** (llama-3.3-70b) for the AI response
2. Serializes the full conversation as a `MemoryBlob` JSON object
3. Stores it on **Walrus** via the publisher REST API → returns a `blobId`
4. Fetches the latest **Sui checkpoint** via **Tatum's enterprise-grade Sui RPC** → proves the storage is anchored to live on-chain state
5. Displays all of this live in the UI — blob ID, checkpoint number, session history

The result: a fully decentralized AI agent whose memory cannot be censored, deleted, or controlled by any single party.

---

## Architecture

```
User (Browser)
     │
     ▼
Next.js 14 Chat UI  ──────────────────────────────────────────────┐
     │                                                             │
     ▼                                                             │
/api/chat (Next.js API Route)                                      │
     │                                                             │
     ├─── 1. retrieveMemory(blobId) ──► Walrus Aggregator          │
     │         (load prior context)      walrus-testnet.walrus.space│
     │                                                             │
     ├─── 2. chat(messages) ──────────► Groq API                   │
     │         (LLM response)            llama-3.3-70b-versatile   │
     │                                                             │
     ├─── 3. storeMemory(blob) ───────► Walrus Publisher           │
     │         (persist to Walrus)       → returns blobId          │
     │                                                             │
     └─── 4. getLatestCheckpoint() ──► Tatum Sui RPC               │
               (verify on-chain)        sui-testnet.gateway.tatum.io│
                                                                   │
     ◄── { reply, blobId, checkpoint } ────────────────────────────┘
```

---

## Walrus Integration

Walrus is used as the **primary persistence layer** for all AI memory. Each conversation is stored as a structured JSON blob with 5-epoch retention on Sui testnet.

**Store:**
```
PUT https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs=5
Body: MemoryBlob JSON
Response: { newlyCreated: { blobObject: { blobId } } }
```

**Retrieve:**
```
GET https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}
Response: MemoryBlob JSON
```

This is meaningful integration — not just storing static assets, but using Walrus as a **live, mutable AI memory store** where every interaction updates the blob and returns a new ID.

---

## Tatum Integration

Tatum's enterprise Sui RPC endpoints are used to:
- **Verify on-chain state** after every memory write — `sui_getLatestCheckpointSequenceNumber`
- **Inspect Walrus blob objects** — `sui_getObject`
- **Confirm network identity** — `sui_getChainIdentifier`

The live checkpoint number is displayed in the UI after every message, proving the agent's memory is anchored to real Sui network state — not a simulation.

```
POST https://sui-testnet.gateway.tatum.io
Headers: { "x-api-key": TATUM_API_KEY }
```

---

## MCP Server (Bonus)

Walrus Mind ships with a full **MCP (Model Context Protocol) server** that exposes 5 tools to AI IDEs like Cursor and Kiro:

| Tool | Description |
|------|-------------|
| `store_memory` | Store messages as Walrus blob → returns blobId |
| `retrieve_memory` | Load a MemoryBlob by blobId from Walrus |
| `get_sui_checkpoint` | Latest Sui checkpoint via Tatum RPC |
| `get_sui_object` | Inspect any Sui object on-chain |
| `chat_with_memory` | Full pipeline: retrieve → chat → store → checkpoint |

---

## Setup

```bash
# 1. Clone
git clone https://github.com/Chibey-max/walrus-mind
cd walrus-mind

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in: TATUM_API_KEY, GROQ_API_KEY
# Walrus and Tatum RPC endpoints are pre-filled

# 4. Run
npm run dev
# → http://localhost:3000
```

**Get your keys (both free):**
- Tatum API key → [dashboard.tatum.io](https://dashboard.tatum.io)
- Groq API key → [console.groq.com](https://console.groq.com)

---

## MCP Setup (Cursor)

```bash
# Run the MCP server
npm run mcp
```

Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "walrus-mind": {
      "command": "npx",
      "args": ["ts-node", "mcp/server.ts"]
    }
  }
}
```

---

## Project Structure

```
walrus-mind/
├── app/
│   ├── page.tsx              # Cyberpunk chat UI
│   ├── layout.tsx
│   └── api/
│       ├── chat/route.ts     # Core: LLM + Walrus + Tatum
│       └── memory/route.ts   # GET blob by ID
├── lib/
│   ├── walrus.ts             # Walrus REST client
│   ├── tatum.ts              # Tatum Sui RPC client
│   └── llm.ts                # Groq client
├── mcp/
│   └── server.ts             # MCP server (5 tools)
├── .cursor/mcp.json
├── .env.example
└── README.md
```

---

## Tech Stack

- **Framework:** Next.js 14 App Router + TypeScript
- **LLM:** Groq (`llama-3.3-70b-versatile`)
- **Storage:** Walrus Protocol (decentralized blob storage on Sui)
- **RPC:** Tatum Sui RPC (enterprise-grade Sui node access)
- **MCP:** `@modelcontextprotocol/sdk`
- **Deploy:** Vercel

---

## Built By

[@Chibey-max](https://github.com/Chibey-max) · Tatum × Walrus Hackathon 2026
