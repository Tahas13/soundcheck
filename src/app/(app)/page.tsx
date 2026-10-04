"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CategoryPill, Empty, GatePill, PageHeader, ScoreRing, SeverityPill, Stat, scoreColor } from "@/components/ui";
import { CHECK_LABELS } from "@/lib/judges";
import { useRuns, useSeedRuns } from "@/lib/store";
import type { CheckId, Run } from "@/lib/types";

export default function Dashboard() {
  const { runs, ready } = useRuns();
  const { seeding } = useSeedRuns();

  const v1 = runs.find((r) => r.agentId === "bella-v1");
  const v2 = runs.find((r) => r.agentId === "bella-v2");
  const latest = runs[0];

  const matrix = useMemo(() => {
    if (!v1 || !v2) return [];
    const ids = new Set<CheckId>();
    for (const r of [...v1.results, ...v2.results]) for (const c of r.checks) ids.add(c.check);
    return [...ids].map((id) => {
      const stat = (run: Run) => {
        const cs = run.results.flatMap((r) => r.checks.filter((c) => c.check === id));
        return { passed: cs.filter((c) => c.passed).length, total: cs.length };
      };
      return { id, label: CHECK_LABELS[id], a: stat(v1), b: stat(v2) };
    });
  }, [v1, v2]);

  if (!ready || seeding) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Running the seeded demo suite against both versions of the demo receptionist…" />
        <div className="card p-10 text-center text-sm text-muted pulse-soft">Simulating 28 calls (14 scenarios × 2 agent versions) and judging them…</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Soundcheck runs synthetic callers against your voice agent, verifies what actually happened (tool calls, not just words), and blocks deploys that regress."
        actions={
          <Link href="/runs/new" className="btn-primary">
            ▶ New run
          </Link>
        }
      />

      {latest && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Latest run" value={latest.summary.score} hint={`${latest.agentName} · ${latest.agentVersion}`} tone={latest.summary.score >= 85 ? "ok" : latest.summary.score >= 60 ? "warn" : "bad"} />
          <Stat label="Scenarios passed" value={`${latest.summary.passed}/${latest.results.length}`} hint={`${latest.summary.criticalFailures} critical failure(s)`} tone={latest.summary.criticalFailures ? "bad" : "ok"} />
          <Stat label="p95 turn latency" value={`${latest.summary.p95LatencyMs} ms`} hint="budget 1,500 ms" tone={latest.summary.p95LatencyMs > 1500 ? "bad" : "ok"} />
          <Stat label="Deploy gate" value={latest.summary.gate === "pass" ? "PASS" : "BLOCKED"} hint={latest.summary.gateReason} tone={latest.summary.gate === "pass" ? "ok" : "bad"} />
        </div>
      )}

      {v1 && v2 && (
        <section className="mb-6 grid gap-4 lg:grid-cols-5">
          <div className="card p-5 lg:col-span-2">
            <div className="mb-4 text-sm font-medium">Version comparison</div>
            <div className="flex items-center justify-around">
              <Link href={`/runs/${v1.id}`} className="group flex flex-col items-center gap-2">
                <ScoreRing score={v1.summary.score} />
                <div className="text-center">
                  <div className="text-xs text-ink group-hover:text-accent">{v1.agentVersion}</div>
                  <GatePill gate={v1.summary.gate} />
                </div>
              </Link>
              <div className="text-2xl text-muted">→</div>
              <Link href={`/runs/${v2.id}`} className="group flex flex-col items-center gap-2">
                <ScoreRing score={v2.summary.score} />
                <div className="text-center">
                  <div className="text-xs text-ink group-hover:text-accent">{v2.agentVersion}</div>
                  <GatePill gate={v2.summary.gate} />
                </div>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">
              Same 14 scenarios, same seed. v1 is a prompt-only agent; v2 adds tool-level validation, KB grounding and escalation rules. Soundcheck is what tells you the difference before customers do.
            </p>
          </div>

          <div className="card p-5 lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium">Check matrix (passed / total)</div>
              <div className="text-xs text-muted">v1 → v2</div>
            </div>
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-sm">
                <tbody>
                  {matrix.map((m) => (
                    <tr key={m.id} className="border-t border-line/60">
                      <td className="py-1.5 pr-2 text-xs text-muted">{m.label}</td>
                      <td className="mono w-16 py-1.5 text-right text-xs" style={{ color: scoreColor((m.a.passed / Math.max(1, m.a.total)) * 100) }}>
                        {m.a.passed}/{m.a.total}
                      </td>
                      <td className="w-6 text-center text-muted">→</td>
                      <td className="mono w-16 py-1.5 text-right text-xs" style={{ color: scoreColor((m.b.passed / Math.max(1, m.b.total)) * 100) }}>
                        {m.b.passed}/{m.b.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {v1 && v1.clusters.length > 0 && (
        <section className="card mb-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium">Failure clusters · {v1.agentVersion}</div>
            <Link href={`/runs/${v1.id}`} className="text-xs text-accent hover:underline">
              Open run →
            </Link>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {v1.clusters.slice(0, 6).map((c) => (
              <div key={c.check} className="rounded-lg border border-line bg-panel-2 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-sm">{c.label}</div>
                  <div className="flex items-center gap-2">
                    <SeverityPill severity={c.severity} />
                    <span className="mono text-xs text-muted">×{c.count}</span>
                  </div>
                </div>
                <div className="text-xs text-muted">{c.sample}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 text-sm font-medium">Recent runs</div>
        {runs.length === 0 ? (
          <Empty title="No runs yet" body="Start a run to simulate callers against an agent." />
        ) : (
          <div className="card divide-y divide-line/60">
            {runs.slice(0, 10).map((r) => (
              <Link key={r.id} href={`/runs/${r.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-panel-2">
                <span className="mono text-lg font-semibold" style={{ color: scoreColor(r.summary.score) }}>
                  {r.summary.score}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    {r.agentName} <span className="text-muted">· {r.agentVersion}</span>
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(r.createdAt).toLocaleString()} · {r.results.length} scenarios · {r.mode} · judges: {r.judgeMode}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[...new Set(r.results.filter((x) => !x.passed).map((x) => x.category))].slice(0, 3).map((c) => (
                    <CategoryPill key={c} category={c} />
                  ))}
                </div>
                <GatePill gate={r.summary.gate} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
