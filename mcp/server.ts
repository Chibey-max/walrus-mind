#!/usr/bin/env node
/**
 * Walrus Mind MCP Server
 * Exposes Walrus storage + Sui RPC tools to AI IDEs (Cursor, Kiro, VS Code)
 *
 * Run: npm run mcp
 */

import * as dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { ChatMessage } from "../lib/llm";
import type { MemoryBlob } from "../lib/walrus";

// IMPORTANT: load .env.local before dynamically importing lib modules.
// Some lib modules read environment variables when they are imported.
dotenv.config({ path: ".env.local" });

async function createServer(): Promise<Server> {
  const { storeMemory, retrieveMemory } = await import("../lib/walrus");
  const { getLatestCheckpoint, getSuiObject } = await import("../lib/tatum");
  const { chat } = await import("../lib/llm");

  const server = new Server(
    {
      name: "walrus-mind",
      version: "1.0.0",
    },
    {
      capabilities: { tools: {} },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "store_memory",
        description:
          "Store a conversation as a JSON memory blob on Walrus decentralized storage on Sui. Returns the Walrus blobId.",
        inputSchema: {
          type: "object",
          properties: {
            sessionId: {
              type: "string",
              description: "Unique session identifier",
            },
            messages: {
              type: "array",
              description: "Array of {role, content} message objects",
              items: {
                type: "object",
                properties: {
                  role: { type: "string", enum: ["user", "assistant", "system"] },
                  content: { type: "string" },
                },
                required: ["role", "content"],
              },
            },
          },
          required: ["sessionId", "messages"],
        },
      },
      {
        name: "retrieve_memory",
        description:
          "Retrieve a stored conversation blob from Walrus by blobId. Returns the full MemoryBlob with message history.",
        inputSchema: {
          type: "object",
          properties: {
            blobId: {
              type: "string",
              description: "The Walrus blob ID to retrieve",
            },
          },
          required: ["blobId"],
        },
      },
      {
        name: "get_sui_checkpoint",
        description:
          "Get the latest Sui network checkpoint sequence number via Tatum RPC. Proves live on-chain connection.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_sui_object",
        description:
          "Get a Sui object by ID via Tatum RPC. Useful for inspecting Walrus blob objects on-chain.",
        inputSchema: {
          type: "object",
          properties: {
            objectId: {
              type: "string",
              description: "The Sui object ID to look up",
            },
          },
          required: ["objectId"],
        },
      },
      {
        name: "chat_with_memory",
        description:
          "Full pipeline: optionally retrieve memory from Walrus, chat with the AI agent, store updated memory back to Walrus. Returns reply + new blobId + Sui checkpoint.",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The user message to send to the agent",
            },
            sessionId: {
              type: "string",
              description: "Session identifier for memory continuity",
            },
            blobId: {
              type: "string",
              description:
                "Optional existing Walrus blobId to load prior memory from",
            },
          },
          required: ["message", "sessionId"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "store_memory": {
          const { sessionId, messages } = args as {
            sessionId: string;
            messages: ChatMessage[];
          };
          const blob: MemoryBlob = {
            sessionId,
            messages,
            timestamp: Date.now(),
            metadata: { model: "mcp", totalMessages: messages.length },
          };
          const blobId = await storeMemory(blob);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ success: true, blobId }),
              },
            ],
          };
        }

        case "retrieve_memory": {
          const { blobId } = args as { blobId: string };
          const memory = await retrieveMemory(blobId);
          return {
            content: [{ type: "text", text: JSON.stringify(memory) }],
          };
        }

        case "get_sui_checkpoint": {
          const checkpoint = await getLatestCheckpoint();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ checkpoint, network: "sui-mainnet" }),
              },
            ],
          };
        }

        case "get_sui_object": {
          const { objectId } = args as { objectId: string };
          const obj = await getSuiObject(objectId);
          return {
            content: [{ type: "text", text: JSON.stringify(obj) }],
          };
        }

        case "chat_with_memory": {
          const { message, sessionId, blobId } = args as {
            message: string;
            sessionId: string;
            blobId?: string;
          };

          let history: ChatMessage[] = [];
          if (blobId) {
            try {
              const mem = await retrieveMemory(blobId);
              history = mem.messages.filter(
                (item): item is ChatMessage =>
                  item.role === "user" ||
                  item.role === "assistant" ||
                  item.role === "system",
              );
            } catch {}
          }

          const messages: ChatMessage[] = [
            ...history,
            { role: "user", content: message },
          ];

          const reply = await chat(messages);
          const updatedMessages: ChatMessage[] = [
            ...messages,
            { role: "assistant", content: reply },
          ];
          const blob: MemoryBlob = {
            sessionId,
            messages: updatedMessages,
            timestamp: Date.now(),
            metadata: {
              model: "llama-3.3-70b-versatile",
              totalMessages: updatedMessages.length,
            },
          };
          const newBlobId = await storeMemory(blob);
          const checkpoint = await getLatestCheckpoint();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ reply, blobId: newBlobId, checkpoint }),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `ERR: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

async function main(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Walrus Mind MCP server running on stdio");
}

main().catch((err: unknown) => {
  console.error("MCP server fatal error:", err);
  process.exit(1);
});
