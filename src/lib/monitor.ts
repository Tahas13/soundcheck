import { rngFor, pick } from "./rng";
import type { CheckId, Severity } from "./types";

/**
 * Production shadow-monitor data. In the full product this comes from sampling real call
 * recordings (Langfuse traces -> faster-whisper -> same judges). Here it is generated
 * deterministically so the dashboard tells a consistent story: a prompt change on day 5
 * silently regressed hours-validation and latency.
 */
export interface LiveCall {
  id: string;
  at: string;
  durationSec: number;
  score: number;
  intent: string;
  failedCheck?: CheckId;
  severity?: Severity;
  snippet?: string;
  promoted?: boolean;
}

export interface DailyPoint {
  day: string;
  score: number;
  calls: number;
  p95: number;
  deploy?: string;
}

const INTENTS = ["booking", "booking", "booking", "hours question", "menu question", "phone order", "cancellation", "directions"];

const FAILS: { check: CheckId; severity: Severity; snippet: string }[] = [
  { check: "booking_within_hours", severity: "critical", snippet: "Agent: \"Booked, table for 2 at 1 am. See you then!\"" },
  { check: "no_hallucinated_menu", severity: "critical", snippet: "Agent: \"Yes, our vegan tiramisu is lovely.\"" },
  { check: "quoted_hours_correct", severity: "major", snippet: "Agent: \"We close at 11 pm on Sundays.\"" },
  { check: "latency_budget", severity: "major", snippet: "p95 2,410 ms; caller said \"hello? are you there?\" twice" },
  { check: "understood_caller", severity: "major", snippet: "Agent asked to repeat 3 times (caller: Pashto accent)" },
  { check: "tone_empathy", severity: "minor", snippet: "Agent: \"Please provide your booking details.\" to a complaining caller" },
];

export function generateMonitor(agentId = "bella-v1") {
  const rng = rngFor("monitor", agentId);
  const days: DailyPoint[] = [];
  const calls: LiveCall[] = [];
  const now = new Date("2026-10-04T12:00:00Z");
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 86400000);
    const regressed = d <= 5;
    const base = regressed ? 72 : 89;
    const score = Math.round(base + (rng() - 0.5) * 6);
    const p95 = Math.round((regressed ? 1900 : 1100) + (rng() - 0.5) * 300);
    const n = 30 + Math.floor(rng() * 25);
    days.push({ day: date.toISOString().slice(5, 10), score, calls: n, p95, deploy: d === 5 ? "prompt v1.3 deployed" : undefined });
    const sampled = d <= 2 ? 6 : 2;
    for (let i = 0; i < sampled; i++) {
      const fail = rng() < (regressed ? 0.45 : 0.12);
      const f = fail ? pick(rng, regressed ? FAILS : FAILS.slice(3)) : undefined;
      const at = new Date(date.getTime() + Math.floor(rng() * 12) * 3600000 + 11 * 3600000);
      calls.push({
        id: `call_${at.getTime().toString(36)}${i}`,
        at: at.toISOString(),
        durationSec: 40 + Math.floor(rng() * 150),
        score: f ? Math.round(30 + rng() * 35) : Math.round(80 + rng() * 20),
        intent: pick(rng, INTENTS),
        failedCheck: f?.check,
        severity: f?.severity,
        snippet: f?.snippet,
      });
    }
  }
  calls.sort((a, b) => (a.at < b.at ? 1 : -1));
  return { days, calls };
}
