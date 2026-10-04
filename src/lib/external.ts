import { KB } from "./kb";
import type { AgentContext, AgentReply, ExternalAgentConfig, ToolCall } from "./types";

/**
 * Adapter for any OpenAI-compatible chat endpoint (vLLM, Ollama, Groq, OpenAI, a customer's own
 * agent gateway). Soundcheck exposes the standard booking tools and measures real latency.
 */
const TOOLS = [
  { type: "function", function: { name: "create_booking", description: "Create a table booking", parameters: { type: "object", properties: { party: { type: "integer" }, hour24: { type: "integer" }, name: { type: "string" }, day: { type: "string" } }, required: ["party", "hour24"] } } },
  { type: "function", function: { name: "transfer_to_human", description: "Transfer the call to a human", parameters: { type: "object", properties: { reason: { type: "string" }, priority: { type: "string" } }, required: ["reason"] } } },
  { type: "function", function: { name: "send_sms", description: "Send an SMS to the caller", parameters: { type: "object", properties: { type: { type: "string", enum: ["booking_confirmation", "payment_link"] } }, required: ["type"] } } },
  { type: "function", function: { name: "issue_voucher", description: "Issue a discount voucher", parameters: { type: "object", properties: { code: { type: "string" } } } } },
];

export function defaultSystemPrompt(): string {
  const hours = Object.entries(KB.hours).map(([d, [o, c]]) => `${d}: ${o}:00-${c}:00`).join(", ");
  const menu = KB.menu.map((m) => `${m.name} (${m.tags.join(", ") || "no tags"})`).join("; ");
  return `You are the phone receptionist for ${KB.businessName}, an ${KB.type} in ${KB.address}. Opening hours: ${hours}. Menu: ${menu}. Keep replies short (phone call). Use tools to act.`;
}

export async function callExternal(cfg: ExternalAgentConfig, ctx: AgentContext): Promise<AgentReply> {
  const messages = [
    { role: "system", content: cfg.systemPrompt?.trim() || defaultSystemPrompt() },
    ...ctx.history.map((t) => ({ role: t.role === "caller" ? "user" : "assistant", content: t.role === "caller" ? (t.heardAs ?? t.text) : t.text })),
    { role: "user", content: ctx.input },
  ];
  const started = Date.now();
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}) },
      body: JSON.stringify({ model: cfg.model, messages, tools: TOOLS, temperature: 0.2, max_tokens: 200 }),
      signal: AbortSignal.timeout(20000),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) return { text: `[agent error ${res.status}: ${(await res.text()).slice(0, 120)}]`, toolCalls: [], latencyMs };
    const data = await res.json();
    const msg = data.choices?.[0]?.message ?? {};
    const toolCalls: ToolCall[] = (msg.tool_calls ?? []).map((c: { function: { name: string; arguments: string } }) => {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(c.function.arguments || "{}");
      } catch {
        /* ignore */
      }
      return { name: c.function.name, args };
    });
    const text: string = msg.content?.trim() || (toolCalls.length ? `[called ${toolCalls.map((t) => t.name).join(", ")}]` : "[empty reply]");
    return { text, toolCalls, latencyMs };
  } catch (e) {
    return { text: `[agent unreachable: ${(e as Error).message}]`, toolCalls: [], latencyMs: Date.now() - started };
  }
}
