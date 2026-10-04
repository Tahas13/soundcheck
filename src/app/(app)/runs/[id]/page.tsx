"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RunView } from "@/components/run-view";
import { Empty, PageHeader } from "@/components/ui";
import { useRuns } from "@/lib/store";
import type { Run } from "@/lib/types";

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { runs, ready, saveRun } = useRuns();
  const [fetched, setFetched] = useState<Run | null>(null);
  const run = runs.find((r) => r.id === id) ?? fetched;

  useEffect(() => {
    if (!ready || run || !id.startsWith("seed-")) return;
    fetch(`/api/runs/seed?agent=${id.replace("seed-", "")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r: Run | null) => {
        if (r) {
          setFetched(r);
          saveRun(r);
        }
      });
  }, [ready, run, id, saveRun]);

  if (!ready) return null;
  if (!run) return <Empty title="Run not found" body="Runs are stored in this browser for the MVP. Start a new run from the dashboard." />;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/report/${run.id}` : undefined;

  return (
    <div>
      <PageHeader
        title="Run report"
        subtitle="Every verdict below is tied to evidence: a tool call, a quoted line, or a latency sample. Expand a scenario to read the judge's rationale and the transcript."
        actions={
          <>
            <Link href={`/report/${run.id}`} className="btn-ghost" target="_blank">
              Open report card ↗
            </Link>
            <Link href="/runs/new" className="btn-primary">
              ▶ New run
            </Link>
          </>
        }
      />
      <RunView run={run} shareUrl={shareUrl} />
    </div>
  );
}
