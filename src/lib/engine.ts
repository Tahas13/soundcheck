import { BUILTIN_AGENTS, BUILTIN_IMPL } from "./agents";
import { degrade } from "./asr";
import { callExternal } from "./external";
import { CHECK_LABELS, runCheck } from "./judges";
import { llmConfig } from "./llm";
import { rngFor } from "./rng";
import { SCENARIOS } from "./scenarios";
import type { AgentDef, AgentReply, FailureCluster, Run, Scenario, ScenarioResult, ToolCall, Turn } from "./types";

const SEVERITY_WEIGHT = { critical: 3, major: 2, minor: 1 } as const;
export const GATE_MIN_SCORE = 85;

export interface RunRequest {
  agent: AgentDef;
  scenarios?: Scenario[];
  seed?: string;
  runId?: string;
}

export function resolveAgent(id: string, custom?: AgentDef[]): AgentDef | undefined {
  return BUILTIN_AGENTS.find((a) => a.id === id) ?? custom?.find((a) => a.id === id);
}

async function respond(agent: AgentDef, ctx: Parameters<(typeof BUILTIN_IMPL)[string]>[0]): Promise<AgentReply> {
  if (agent.kind === "builtin") return BUILTIN_IMPL[agent.id](ctx);
  if (!agent.external) throw new Error("external agent missing config");
  return callExternal(agent.external, ctx);
}

export async function runScenario(agent: AgentDef, scenario: Scenario, seed: string): Promise<ScenarioResult> {
  const rng = rngFor(agent.id, agent.version, scenario.id, seed);
  const turns: Turn[] = [];
  const toolCalls: ToolCall[] = [];

  for (const line of scenario.script) {
    const heardAs = degrade(line, scenario.stressors, rng);
    const callerTurn: Turn = { role: "caller", text: line, heardAs };
    const reply = await respond(agent, { history: turns, input: heardAs ?? line, rng, stressors: scenario.stressors });
    turns.push(callerTurn);
    turns.push({ role: "agent", text: reply.text, latencyMs: reply.latencyMs, toolCalls: reply.toolCalls });
    toolCalls.push(...reply.toolCalls);
  }

  const checks = await Promise.all(scenario.expectations.map((e) => runCheck(e, scenario, turns, toolCalls)));
  const weightSum = checks.reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0);
  const score = Math.round(checks.reduce((s, c) => s + c.score * SEVERITY_WEIGHT[c.severity], 0) / Math.max(1, weightSum));
  const criticalFail = checks.some((c) => c.severity === "critical" && !c.passed);
  const lats = turns.filter((t) => t.role === "agent").map((t) => t.latencyMs ?? 0).sort((a, b) => a - b);
  const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0;
  const p95 = lats.length ? lats[Math.min(lats.length - 1, Math.floor(lats.length * 0.95))] : 0;

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    category: scenario.category,
    turns,
    checks,
    score,
    passed: !criticalFail && score >= 70,
    avgLatencyMs: avg,
    p95LatencyMs: p95,
    toolCalls,
  };
}

export async function runSuite(req: RunRequest): Promise<Run> {
  const scenarios = req.scenarios?.length ? req.scenarios : SCENARIOS;
  const seed = req.seed ?? "default";
  const results: ScenarioResult[] = [];
  for (const s of scenarios) results.push(await runScenario(req.agent, s, seed));

  const score = Math.round(results.reduce((a, r) => a + r.score, 0) / Math.max(1, results.length));
  const passed = results.filter((r) => r.passed).length;
  const criticalFailures = results.reduce((n, r) => n + r.checks.filter((c) => c.severity === "critical" && !c.passed).length, 0);
  const allLats = results.flatMap((r) => r.turns.filter((t) => t.role === "agent").map((t) => t.latencyMs ?? 0)).sort((a, b) => a - b);
  const avgLatencyMs = allLats.length ? Math.round(allLats.reduce((a, b) => a + b, 0) / allLats.length) : 0;
  const p95LatencyMs = allLats.length ? allLats[Math.min(allLats.length - 1, Math.floor(allLats.length * 0.95))] : 0;
  const gatePass = score >= GATE_MIN_SCORE && criticalFailures === 0;

  const clusterMap = new Map<string, FailureCluster>();
  for (const r of results) {
    for (const c of r.checks) {
      if (c.passed) continue;
      const cur = clusterMap.get(c.check) ?? { check: c.check, label: CHECK_LABELS[c.check], severity: c.severity, count: 0, scenarioIds: [], sample: c.rationale };
      cur.count += 1;
      cur.scenarioIds.push(r.scenarioId);
      if (SEVERITY_WEIGHT[c.severity] > SEVERITY_WEIGHT[cur.severity]) cur.severity = c.severity;
      clusterMap.set(c.check, cur);
    }
  }
  const clusters = [...clusterMap.values()].sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] || b.count - a.count);

  return {
    id: req.runId ?? `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    agentId: req.agent.id,
    agentName: req.agent.name,
    agentVersion: req.agent.version,
    createdAt: new Date().toISOString(),
    mode: req.agent.kind === "builtin" ? "simulated" : "external",
    judgeMode: llmConfig().enabled ? "rule+llm" : "rule+heuristic",
    results,
    summary: {
      score,
      passed,
      failed: results.length - passed,
      criticalFailures,
      gate: gatePass ? "pass" : "fail",
      gateReason: gatePass
        ? `Score ${score} >= ${GATE_MIN_SCORE} and 0 critical failures.`
        : criticalFailures > 0
          ? `${criticalFailures} critical check(s) failed. Deploy blocked.`
          : `Score ${score} < ${GATE_MIN_SCORE}. Deploy blocked.`,
      avgLatencyMs,
      p95LatencyMs,
    },
    clusters,
  };
}
