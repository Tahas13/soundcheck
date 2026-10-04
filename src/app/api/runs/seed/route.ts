import { NextResponse } from "next/server";
import { resolveAgent, runSuite } from "@/lib/engine";

/** Deterministic demo runs. Public so shareable report links work on any device. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const agentId = url.searchParams.get("agent") ?? "bella-v1";
  const agent = resolveAgent(agentId);
  if (!agent || agent.kind !== "builtin") return NextResponse.json({ error: "unknown built-in agent" }, { status: 404 });
  const run = await runSuite({ agent, seed: "default", runId: `seed-${agentId}` });
  return NextResponse.json(run);
}
