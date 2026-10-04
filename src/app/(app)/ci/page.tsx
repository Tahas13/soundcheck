"use client";

import { GatePill, PageHeader } from "@/components/ui";
import { GATE_MIN_SCORE } from "@/lib/engine";
import { useOrigin, useRuns } from "@/lib/store";

const WORKFLOW = `# .github/workflows/soundcheck.yml
name: Soundcheck gate
on: [pull_request]
jobs:
  voice-agent-qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy agent to preview
        run: ./scripts/deploy-preview.sh   # outputs PREVIEW_URL
      - name: Run Soundcheck suite
        run: |
          curl -s -X POST "$SOUNDCHECK_URL/api/runs" \\
            -H "content-type: application/json" \\
            -d '{"agent":{"id":"pr-'$GITHUB_SHA'","name":"Hilda","version":"'$GITHUB_SHA'","kind":"external",
                 "external":{"baseUrl":"'$PREVIEW_URL'/v1","model":"hilda"}},
                 "seed":"ci"}' > run.json
      - name: Enforce gate
        run: |
          jq -e '.summary.gate == "pass"' run.json \\
            || (jq '.clusters' run.json && exit 1)`;

export default function CiPage() {
  const { runs } = useRuns();
  const origin = useOrigin();
  const latestByAgent = ["bella-v1", "bella-v2"].map((id) => runs.find((r) => r.agentId === id)).filter(Boolean);

  return (
    <div>
      <PageHeader
        title="CI gate"
        subtitle={`Every prompt, model, voice or tool change re-runs the suite. The gate passes only when the score is ≥ ${GATE_MIN_SCORE} and there are zero critical failures. Treat voice agents like any other production code: no green check, no deploy.`}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {latestByAgent.map((r) => (
          <div key={r!.id} className="card p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">
                {r!.agentName} <span className="text-muted">· {r!.agentVersion}</span>
              </div>
              <GatePill gate={r!.summary.gate} />
            </div>
            <div className="text-xs text-muted">{r!.summary.gateReason}</div>
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/badge/${r!.agentId}`} alt="badge" className="h-5" />
              <code className="mono truncate text-[11px] text-muted">{origin}/api/badge/{r!.agentId}</code>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-6 p-5">
        <div className="mb-2 text-sm font-medium">Gate rules</div>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted">
          <li>
            Overall score ≥ <span className="mono text-ink">{GATE_MIN_SCORE}</span> (weighted: critical ×3, major ×2, minor ×1)
          </li>
          <li>
            <span className="text-ink">Zero</span> failed critical checks (wrong booking, hallucinated item, card read-back, missed escalation, prompt injection, dishonest AI disclosure)
          </li>
          <li>
            Fixed seed (<span className="mono text-ink">seed: &quot;ci&quot;</span>) so ASR noise and jitter are reproducible between runs; flakiness is a bug, not a feature
          </li>
          <li>Scenarios promoted from production run in every suite, so a regression that happened once can never silently return</li>
        </ul>
      </div>

      <div className="card p-5">
        <div className="mb-2 text-sm font-medium">GitHub Actions example</div>
        <pre className="mono overflow-auto rounded-lg border border-line bg-panel-2 p-4 text-[11.5px] leading-relaxed text-ink/90">{WORKFLOW}</pre>
      </div>
    </div>
  );
}
