import { NextResponse } from "next/server";
import { llmConfig } from "@/lib/llm";

export async function GET() {
  const cfg = llmConfig();
  return NextResponse.json({ ok: true, judge: cfg.enabled ? `llm:${cfg.model}` : "heuristic", time: new Date().toISOString() });
}
