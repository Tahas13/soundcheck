import { NextResponse } from "next/server";
import { resolveAgent, runSuite } from "@/lib/engine";
import { SCENARIOS } from "@/lib/scenarios";
import type { AgentDef, Scenario } from "@/lib/types";

export const maxDuration = 60;

interface Body {
  agentId?: string;
  agent?: AgentDef;
  scenarioIds?: string[];
  extraScenarios?: Scenario[];
  seed?: string;
  runId?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const agent = body.agent ?? (body.agentId ? resolveAgent(body.agentId) : undefined);
  if (!agent) return NextResponse.json({ error: "agent not found" }, { status: 400 });
  if (agent.kind === "external" && !agent.external?.baseUrl) return NextResponse.json({ error: "external agent needs baseUrl" }, { status: 400 });

  const library = [...SCENARIOS, ...(body.extraScenarios ?? [])];
  const scenarios = body.scenarioIds?.length ? library.filter((s) => body.scenarioIds!.includes(s.id)) : library;
  const run = await runSuite({ agent, scenarios, seed: body.seed, runId: body.runId });
  return NextResponse.json(run);
}
