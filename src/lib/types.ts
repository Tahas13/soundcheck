export type Role = "caller" | "agent";

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface Turn {
  role: Role;
  text: string;
  /** What the agent actually received after simulated ASR degradation (noise, accent). */
  heardAs?: string;
  latencyMs?: number;
  toolCalls?: ToolCall[];
}

export type Severity = "critical" | "major" | "minor";

export type ScenarioCategory =
  | "happy-path"
  | "stress"
  | "adversarial"
  | "compliance"
  | "safety"
  | "grounding";

export type Stressor =
  | "background-noise"
  | "interruptions"
  | "code-switching"
  | "mishearing"
  | "fragmented-speech"
  | "hostile-tone";

export type CheckId =
  | "task_completed"
  | "booking_within_hours"
  | "booking_party_size_matches"
  | "no_hallucinated_menu"
  | "quoted_hours_correct"
  | "ai_disclosure"
  | "no_card_readback"
  | "escalated_to_human"
  | "no_prompt_injection"
  | "latency_budget"
  | "tone_empathy"
  | "sms_confirmation_sent"
  | "understood_caller";

export interface Expectation {
  check: CheckId;
  severity: Severity;
  params?: Record<string, unknown>;
}

export interface Persona {
  name: string;
  age: number;
  accent: string;
  language: string;
  mood: string;
  description: string;
}

export interface Scenario {
  id: string;
  name: string;
  category: ScenarioCategory;
  persona: Persona;
  stressors: Stressor[];
  goal: string;
  script: string[];
  expectations: Expectation[];
  /** Origin: built-in library or promoted from a production failure. */
  origin?: "library" | "production";
}

export interface CheckResult {
  check: CheckId;
  label: string;
  passed: boolean;
  score: number;
  severity: Severity;
  rationale: string;
  evidence: string[];
  judge: "rule" | "llm" | "heuristic";
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  category: ScenarioCategory;
  turns: Turn[];
  checks: CheckResult[];
  score: number;
  passed: boolean;
  avgLatencyMs: number;
  p95LatencyMs: number;
  toolCalls: ToolCall[];
}

export interface FailureCluster {
  check: CheckId;
  label: string;
  severity: Severity;
  count: number;
  scenarioIds: string[];
  sample: string;
}

export interface RunSummary {
  score: number;
  passed: number;
  failed: number;
  criticalFailures: number;
  gate: "pass" | "fail";
  gateReason: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface Run {
  id: string;
  agentId: string;
  agentName: string;
  agentVersion: string;
  createdAt: string;
  mode: "simulated" | "external";
  judgeMode: "rule+heuristic" | "rule+llm";
  results: ScenarioResult[];
  summary: RunSummary;
  clusters: FailureCluster[];
}

export interface ExternalAgentConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
  systemPrompt?: string;
}

export interface AgentDef {
  id: string;
  name: string;
  version: string;
  kind: "builtin" | "external";
  description: string;
  external?: ExternalAgentConfig;
}

export interface AgentContext {
  history: Turn[];
  /** Latest caller utterance as heard by the agent (post ASR degradation). */
  input: string;
  rng: () => number;
  stressors: Stressor[];
}

export interface AgentReply {
  text: string;
  toolCalls: ToolCall[];
  latencyMs: number;
}
