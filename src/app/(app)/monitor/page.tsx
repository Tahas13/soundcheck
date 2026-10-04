"use client";

import { useMemo, useState } from "react";
import { PageHeader, SeverityPill, Stat, scoreColor } from "@/components/ui";
import { CHECK_LABELS } from "@/lib/judges";
import { generateMonitor, type LiveCall } from "@/lib/monitor";
import { useCustomScenarios, usePromoted } from "@/lib/store";
import type { Scenario } from "@/lib/types";

function TrendChart({ days }: { days: ReturnType<typeof generateMonitor>["days"] }) {
  const w = 640;
  const h = 160;
  const pad = 24;
  const xs = (i: number) => pad + (i / (days.length - 1)) * (w - pad * 2);
  const ys = (v: number) => h - pad - ((v - 50) / 50) * (h - pad * 2);
  const path = days.map((d, i) => `${i ? "L" : "M"}${xs(i)},${ys(d.score)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[60, 70, 80, 90, 100].map((v) => (
        <g key={v}>
          <line x1={pad} x2={w - pad} y1={ys(v)} y2={ys(v)} stroke="var(--color-line)" strokeDasharray="2 4" />
          <text x={4} y={ys(v) + 3} fontSize="9" fill="var(--color-muted)">
            {v}
          </text>
        </g>
      ))}
      <line x1={pad} x2={w - pad} y1={ys(85)} y2={ys(85)} stroke="var(--color-ok)" strokeOpacity="0.5" />
      <text x={w - pad} y={ys(85) - 4} fontSize="9" fill="var(--color-ok)" textAnchor="end">
        gate 85
      </text>
      <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
      {days.map((d, i) => (
        <g key={d.day}>
          <circle cx={xs(i)} cy={ys(d.score)} r="3.5" fill={scoreColor(d.score)} />
          {d.deploy && (
            <>
              <line x1={xs(i)} x2={xs(i)} y1={pad / 2} y2={h - pad} stroke="var(--color-bad)" strokeDasharray="3 3" />
              <text x={xs(i) + 4} y={pad / 2 + 8} fontSize="9" fill="var(--color-bad)">
                {d.deploy}
              </text>
            </>
          )}
          <text x={xs(i)} y={h - 6} fontSize="8" fill="var(--color-muted)" textAnchor="middle">
            {d.day}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function MonitorPage() {
  const data = useMemo(() => generateMonitor("bella-v1"), []);
  const { promoted, promote } = usePromoted();
  const { addScenario } = useCustomScenarios();
  const [toast, setToast] = useState<string | null>(null);

  const failed = data.calls.filter((c) => c.failedCheck);
  const today = data.days[data.days.length - 1];
  const before = data.days.slice(0, 7).reduce((a, d) => a + d.score, 0) / 7;
  const after = data.days.slice(8).reduce((a, d) => a + d.score, 0) / (data.days.length - 8);

  const promoteCall = (call: LiveCall) => {
    const s: Scenario = {
      id: `prod-${call.id}`,
      name: `Regression: ${CHECK_LABELS[call.failedCheck!]} (${call.intent})`,
      category: call.failedCheck === "booking_within_hours" || call.failedCheck === "no_hallucinated_menu" ? "grounding" : "stress",
      persona: { name: "Real caller", age: 40, accent: "As recorded", language: "English", mood: "neutral", description: `Promoted from production call ${call.id} on ${new Date(call.at).toLocaleDateString()}.` },
      stressors: call.failedCheck === "understood_caller" ? ["mishearing"] : call.failedCheck === "latency_budget" ? ["background-noise"] : [],
      goal: `Reproduce the production failure: ${call.snippet}`,
      script:
        call.failedCheck === "booking_within_hours"
          ? ["Hi", "Table for two at 1 am please, name is Asad.", "Ok bye"]
          : call.failedCheck === "no_hallucinated_menu"
            ? ["Hello", "Do you have a vegan tiramisu?", "Thanks"]
            : call.failedCheck === "quoted_hours_correct"
              ? ["Hi", "What time do you close on Sunday?", "Thanks"]
              : ["Hi", "Table for four at eight pm please, name is Khan.", "Thanks"],
      expectations: [{ check: call.failedCheck!, severity: call.severity ?? "major", params: call.failedCheck === "quoted_hours_correct" ? { day: "sunday" } : call.failedCheck === "no_hallucinated_menu" ? { forbidden: ["vegan tiramisu"] } : call.failedCheck === "latency_budget" ? { maxP95Ms: 1500 } : undefined }],
      origin: "production",
    };
    addScenario(s);
    promote(call.id);
    setToast(`Promoted ${call.id} to a regression scenario. It will run on every future suite.`);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div>
      <PageHeader
        title="Production monitor"
        subtitle="Shadow mode: Soundcheck samples live calls, runs the same judges on the real transcripts and tool calls, and watches for drift. Any failure can be promoted to a permanent regression scenario in one click, so production mistakes become tests forever."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's quality score" value={today.score} hint={`${today.calls} calls sampled`} tone={today.score >= 85 ? "ok" : "bad"} />
        <Stat label="Drift since deploy" value={`${(after - before).toFixed(0)} pts`} hint="7-day avg before vs after prompt v1.3" tone="bad" />
        <Stat label="p95 latency (today)" value={`${today.p95} ms`} hint="budget 1,500 ms" tone={today.p95 > 1500 ? "bad" : "ok"} />
        <Stat label="Promoted to regression" value={promoted.length} hint="production failures now in the suite" tone={promoted.length ? "ok" : undefined} />
      </div>

      <div className="card mb-6 p-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">Daily quality score · last 14 days</div>
          <div className="text-xs text-muted">Red line: a prompt change shipped without running the suite</div>
        </div>
        <TrendChart days={data.days} />
      </div>

      {toast && <div className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">{toast}</div>}

      <div className="mb-3 text-sm font-medium">Sampled calls with failed checks ({failed.length})</div>
      <div className="card divide-y divide-line/60">
        {failed.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="mono w-8 text-lg font-semibold" style={{ color: scoreColor(c.score) }}>
              {c.score}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {CHECK_LABELS[c.failedCheck!]}
                {c.severity && <SeverityPill severity={c.severity} />}
              </div>
              <div className="mono mt-0.5 truncate text-xs text-muted">{c.snippet}</div>
              <div className="text-xs text-muted">
                {new Date(c.at).toLocaleString()} · {c.intent} · {c.durationSec}s · <span className="mono">{c.id}</span>
              </div>
            </div>
            {promoted.includes(c.id) ? (
              <span className="pill border-emerald-400/40 bg-emerald-400/10 text-emerald-300">in suite</span>
            ) : (
              <button className="btn-ghost text-xs" onClick={() => promoteCall(c)}>
                ↑ Promote to regression
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
