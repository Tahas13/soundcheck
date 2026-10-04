"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell";
import { ScenarioCard } from "@/components/run-view";
import { CategoryPill, GatePill, ScoreRing } from "@/components/ui";
import { useRuns } from "@/lib/store";
import type { Run } from "@/lib/types";

/**
 * Public, shareable Report Card. This is what an agency hands to the business owner:
 * "Your receptionist passed N scenarios, 0 hallucinated bookings." No login required.
 */
export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { runs, ready } = useRuns();
  const [fetched, setFetched] = useState<Run | null | undefined>(undefined);
  const isSeed = id.startsWith("seed-");
  const run = runs.find((r) => r.id === id) ?? fetched;

  useEffect(() => {
    if (!ready || run || !isSeed) return;
    fetch(`/api/runs/seed?agent=${id.replace("seed-", "")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => setFetched(r));
  }, [ready, run, id, isSeed]);

  const loading = !ready || (isSeed && run === undefined);
  if (loading) return <div className="p-10 text-center text-sm text-muted pulse-soft">Loading report…</div>;
  if (!run) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <Logo size="lg" />
          <p className="mt-6 text-sm text-muted">This report was generated in another browser. In the MVP, custom runs live in local storage; seeded demo reports are always available:</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link className="btn-ghost" href="/report/seed-bella-v1">
              Demo report v1
            </Link>
            <Link className="btn-ghost" href="/report/seed-bella-v2">
              Demo report v2
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const byCat = [...new Set(run.results.map((r) => r.category))].map((c) => ({
    c,
    passed: run.results.filter((r) => r.category === c && r.passed).length,
    total: run.results.filter((r) => r.category === c).length,
  }));
  const criticalChecks = run.results.flatMap((r) => r.checks.filter((c) => c.severity === "critical"));
  const hallucinated = run.results.flatMap((r) => r.checks.filter((c) => c.check === "no_hallucinated_menu" && !c.passed)).length;
  const badBookings = run.results.flatMap((r) => r.checks.filter((c) => (c.check === "booking_within_hours" || c.check === "booking_party_size_matches") && !c.passed)).length;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Logo size="lg" />
        <div className="text-right text-xs text-muted">
          <div>Report card · {new Date(run.createdAt).toLocaleDateString()}</div>
          <div className="mono">{run.id}</div>
        </div>
      </div>

      <div className="card mb-6 flex flex-wrap items-center gap-6 p-6">
        <ScoreRing score={run.summary.score} size={128} label="Soundcheck score" />
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-muted">Agent under test</div>
          <div className="text-xl font-semibold">
            {run.agentName} <span className="text-muted">· {run.agentVersion}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <GatePill gate={run.summary.gate} />
            <span className="pill border-line text-muted">{run.results.length} scenarios</span>
            <span className="pill border-line text-muted">{criticalChecks.length} critical checks</span>
          </div>
          <p className="mt-3 text-sm text-muted">{run.summary.gateReason}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Hallucinated menu items</div>
          <div className={`mono mt-1 text-3xl font-semibold ${hallucinated ? "text-rose-300" : "text-emerald-300"}`}>{hallucinated}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">Wrong bookings created</div>
          <div className={`mono mt-1 text-3xl font-semibold ${badBookings ? "text-rose-300" : "text-emerald-300"}`}>{badBookings}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase tracking-wide text-muted">p95 response time</div>
          <div className={`mono mt-1 text-3xl font-semibold ${run.summary.p95LatencyMs > 1500 ? "text-rose-300" : "text-emerald-300"}`}>{(run.summary.p95LatencyMs / 1000).toFixed(1)}s</div>
        </div>
      </div>

      <div className="card mb-6 p-5">
        <div className="mb-3 text-sm font-medium">Coverage by category</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {byCat.map((b) => (
            <div key={b.c} className="flex items-center justify-between rounded-lg border border-line bg-panel-2 px-3 py-2">
              <CategoryPill category={b.c} />
              <span className={`mono text-sm ${b.passed === b.total ? "text-emerald-300" : "text-rose-300"}`}>
                {b.passed}/{b.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-3 text-sm font-medium">Scenario detail</div>
      <div className="space-y-2">
        {run.results.map((r) => (
          <ScenarioCard key={r.scenarioId} r={r} />
        ))}
      </div>

      <div className="mt-10 border-t border-line pt-4 text-center text-xs text-muted">
        Generated by Soundcheck · judges: {run.judgeMode} · Evidence-based: every verdict cites a tool call, transcript line or latency sample.{" "}
        <Link href="/login" className="text-accent hover:underline">
          Open the workspace
        </Link>
      </div>
    </div>
  );
}
