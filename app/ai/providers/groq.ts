import { createGroq } from "@ai-sdk/groq";

export function getGroqModel() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is required for Groq agent execution");
  const groq = createGroq({ apiKey });
  return groq(process.env.GROQ_MODEL ?? "openai/gpt-oss-120b");
}
