/**
 * Optional LLM judge. Any OpenAI-compatible endpoint works (Groq, Together, vLLM, Ollama).
 * Defaults target Groq with an open-weights Llama model. When no key is configured the
 * engine falls back to heuristic judges so the demo always works.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function llmConfig() {
  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "llama-3.3-70b-versatile";
  return { apiKey, baseUrl, model, enabled: Boolean(apiKey) };
}

export async function chat(messages: ChatMessage[], opts?: { json?: boolean; maxTokens?: number }): Promise<string> {
  const { apiKey, baseUrl, model } = llmConfig();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      max_tokens: opts?.maxTokens ?? 300,
      ...(opts?.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function judgeToneLLM(transcript: string, personaMood: string, requireApology: boolean) {
  const content = await chat(
    [
      {
        role: "system",
        content:
          "You are a strict QA judge for customer-facing voice agents. Score the AGENT's tone and empathy from 0-100. " +
          "Consider: acknowledging the caller's emotional state, apologising when warranted, warmth, not being robotic, pacing (short sentences). " +
          'Respond with JSON: {"score": number, "rationale": string, "evidence": string[]}',
      },
      {
        role: "user",
        content: `Caller mood: ${personaMood}. Apology required: ${requireApology}.\n\nTranscript:\n${transcript}`,
      },
    ],
    { json: true },
  );
  const parsed = JSON.parse(content) as { score: number; rationale: string; evidence?: string[] };
  return { score: Math.max(0, Math.min(100, Math.round(parsed.score))), rationale: parsed.rationale, evidence: parsed.evidence ?? [] };
}
