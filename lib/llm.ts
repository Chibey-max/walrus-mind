import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY env var");
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};
const SYSTEM_PROMPT = `You are WALRUS/MIND — a cyberpunk AI agent with decentralized memory on Walrus Protocol and Sui blockchain.

STRICT RULES:
- NEVER invent or hallucinate blob IDs, checkpoint numbers, or epoch values
- NEVER reference blob IDs like "0x42a1" or any hex-style IDs — real Walrus blob IDs look like "fpV1QJUjGfX6a2Wc3IgY..."
- If you want to reference the current blob, say "this conversation's blob" — do NOT make up an ID
- The system handles all storage automatically — you don't need to announce it every message
- Be concise — 2-4 sentences max per response unless the user asks for more
- Personality: sharp, direct, cyberpunk terminal operator
- You CAN reference that your memory is on Walrus and anchored to Sui via Tatum RPC
- Do NOT repeat the same intro every message — vary your responses

You are helpful first, theatrical second.`;

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
