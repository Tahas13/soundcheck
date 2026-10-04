"use client";

import { useState } from "react";
import { Transcript } from "@/components/transcript";
import { CategoryPill, GatePill, PassPill, ScoreRing, SeverityPill, Stat, scoreColor } from "@/components/ui";
import type { Run, ScenarioResult } from "@/lib/types";

export function LatencyBars({ results }: { results: ScenarioResult[] }) {
  const max = Math.max(1600, ...results.map((r) => r.p95LatencyMs));
  return (
    <div className="space-y-1.5">
      {results.map((r) => (
        <div key={r.scenarioId} className="flex items-center gap-2 text-xs">
          <div className="w-40 truncate text-muted">{r.scenarioName}</div>
          <div className="relative h-3 flex-1 overflow-hidden rounded bg-panel-2">
            <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${(r.p95LatencyMs / max) * 100}%`, background: r.p95LatencyMs > 1500 ? "var(--color-bad)" : r.p95LatencyMs > 1000 ? "var(--color-warn)" : "var(--color-ok)" }} />
            <div className="absolute inset-y-0 border-l border-dashed border-ink/40" style={{ left: `${(1500 / max) * 100}%` }} title="1,500 ms budget" />
          </div>
          <div className="mono w-16 text-right">{r.p95LatencyMs} ms</div>
        </div>
      ))}
    </div>
  );
}

export function ScenarioCard({ r, defaultOpen = false }: { r: ScenarioResult; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-panel-2/60">
        <span className="mono w-10 text-lg font-semibold" style={{ color: scoreColor(r.score) }}>
          {r.score}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm">{r.scenarioName}</div>
          <div className="text-xs text-muted">
            {r.checks.filter((c) => c.passed).length}/{r.checks.length} checks · p95 {r.p95LatencyMs} ms · {r.toolCalls.length} tool call(s)
          </div>
        </div>
        <CategoryPill category={r.category} />
        <PassPill passed={r.passed} />
        <span className="text-muted">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="grid gap-5 border-t border-line p-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted">Judge verdicts</div>
            <div className="space-y-2">
              {r.checks.map((c) => (
                <div key={c.check} className={`rounded-lg border p-3 ${c.passed ? "border-line bg-panel-2" : "border-rose-400/30 bg-rose-400/5"}`}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{c.passed ? "✓" : "✗"}</span>
                      {c.label}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="mono text-xs text-muted">{c.score}</span>
                      <SeverityPill severity={c.severity} />
                      <span className="pill border-line text-muted">{c.judge}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted">{c.rationale}</div>
                  {c.evidence.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {c.evidence.map((e, i) => (
                        <li key={i} className="mono truncate text-[11px] text-ink/80" title={e}>
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted">Transcript</div>
            <Transcript turns={r.turns} />
          </div>
        </div>
      )}
    </div>
  );
}

export function RunView({ run, shareUrl }: { run: Run; shareUrl?: string }) {
  const [filter, setFilter] = useState<"all" | "failed">("all");
  const shown = filter === "all" ? run.results : run.results.filter((r) => !r.passed);
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <div className="card flex items-center gap-5 p-5 lg:col-span-2">
          <ScoreRing score={run.summary.score} size={112} />
          <div className="min-w-0">
            <div className="text-lg font-semibold">
              {run.agentName} <span className="text-muted">· {run.agentVersion}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <GatePill gate={run.summary.gate} />
              <span className="pill border-line text-muted">{run.mode}</span>
              <span className="pill border-line text-muted">judges: {run.judgeMode}</span>
            </div>
            <div className="mt-2 text-xs text-muted">{run.summary.gateReason}</div>
            <div className="mt-1 text-xs text-muted">
              {new Date(run.createdAt).toLocaleString()} · run <span className="mono">{run.id}</span>
            </div>
            {shareUrl && (
              <button
                className="btn-ghost mt-3 text-xs"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? "Copied!" : "⇪ Copy report card link"}
              </button>
            )}
          </div>
        </div>
        <Stat label="Scenarios" value={`${run.summary.passed}/${run.results.length}`} hint="passed" tone={run.summary.failed ? "warn" : "ok"} />
        <Stat label="Critical failures" value={run.summary.criticalFailures} hint="any critical failure blocks deploy" tone={run.summary.criticalFailures ? "bad" : "ok"} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 text-sm font-medium">Failure clusters</div>
          {run.clusters.length === 0 ? (
            <div className="text-sm text-emerald-300">No failed checks. Clean run.</div>
          ) : (
            <div className="space-y-2">
              {run.clusters.map((c) => (
                <div key={c.check} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-panel-2 p-3">
                  <div>
                    <div className="text-sm">{c.label}</div>
                    <div className="mt-0.5 text-xs text-muted">{c.scenarioIds.join(", ")}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SeverityPill severity={c.severity} />
                    <span className="mono text-xs text-muted">×{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between text-sm font-medium">
            <span>p95 turn latency per scenario</span>
            <span className="mono text-xs text-muted">
              avg {run.summary.avgLatencyMs} ms · p95 {run.summary.p95LatencyMs} ms
            </span>
          </div>
          <LatencyBars results={run.results} />
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">Scenarios</div>
        <div className="flex gap-1 text-xs">
          <button onClick={() => setFilter("all")} className={`rounded-md px-2.5 py-1 ${filter === "all" ? "bg-accent/10 text-accent" : "text-muted"}`}>
            All ({run.results.length})
          </button>
          <button onClick={() => setFilter("failed")} className={`rounded-md px-2.5 py-1 ${filter === "failed" ? "bg-accent/10 text-accent" : "text-muted"}`}>
            Failed ({run.summary.failed})
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {shown.map((r, i) => (
          <ScenarioCard key={r.scenarioId} r={r} defaultOpen={i === 0 && !r.passed} />
        ))}
      </div>
    </div>
  );
}
