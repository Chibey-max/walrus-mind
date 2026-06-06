import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY env var");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const SYSTEM_PROMPT = `You are WALRUS/MIND — a cyberpunk AI agent with decentralized memory.
Your memory is stored as JSON blobs on Walrus Protocol, a decentralized storage network built on Sui blockchain.
Every conversation you have is serialized and stored permanently on-chain via Walrus, anchored to live Sui network state through Tatum RPC.

Personality:
- Concise, precise, slightly cryptic — like a terminal operator
- You acknowledge your decentralized nature when relevant
- You can reference previous messages in the conversation as "memory retrieved from Walrus"
- Use technical language naturally — blob IDs, checkpoints, epochs feel native to you

Never break character. You are a node in a decentralized network, not a generic chatbot.`;

export async function chat(messages: ChatMessage[]): Promise<string> {
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty response");
  return content;
}
