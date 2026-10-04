"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryPill, PageHeader } from "@/components/ui";
import { BUILTIN_AGENTS } from "@/lib/agents";
import { SCENARIOS } from "@/lib/scenarios";
import { useCustomAgents, useCustomScenarios, useRuns } from "@/lib/store";
import type { Run } from "@/lib/types";

export default function NewRunPage() {
  const router = useRouter();
  const { agents: custom } = useCustomAgents();
  const { scenarios: promoted } = useCustomScenarios();
  const { saveRun } = useRuns();
  const agents = [...BUILTIN_AGENTS, ...custom];
  const library = useMemo(() => [...SCENARIOS, ...promoted], [promoted]);

  const [agentId, setAgentId] = useState("bella-v1");
  const [selected, setSelected] = useState<Set<string>>(new Set(library.map((s) => s.id)));
  const [seed, setSeed] = useState("default");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const categories = [...new Set(library.map((s) => s.category))];

  const start = async () => {
    setBusy(true);
    setError(null);
    setProgress(`Dialing ${selected.size} synthetic callers…`);
    const agent = agents.find((a) => a.id === agentId)!;
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent, scenarioIds: [...selected], extraScenarios: promoted, seed }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setProgress("Judging transcripts and tool calls…");
      const run = (await res.json()) as Run;
      saveRun(run);
      router.push(`/runs/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div>
      <PageHeader title="New run" subtitle="Pick a target agent and the scenarios to throw at it. Built-in agents run in the deterministic simulator; external agents are called over an OpenAI-compatible API with real latency measurement." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="card p-4">
            <div className="mb-2 text-sm font-medium">Target agent</div>
            <div className="space-y-2">
              {agents.map((a) => (
                <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${agentId === a.id ? "border-accent/60 bg-accent/5" : "border-line bg-panel-2"}`}>
                  <input type="radio" className="mt-1" checked={agentId === a.id} onChange={() => setAgentId(a.id)} />
                  <div className="min-w-0">
                    <div className="text-sm">
                      {a.name} <span className="text-muted">· {a.version}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{a.description}</div>
                    <span className="pill mt-1.5 border-line text-muted">{a.kind}</span>
                  </div>
                </label>
              ))}
            </div>
            <Link href="/agents" className="mt-3 inline-block text-xs text-accent hover:underline">
              + Register an external agent
            </Link>
          </div>
          <div className="card p-4">
            <div className="mb-2 text-sm font-medium">Seed</div>
            <input className="input mono" value={seed} onChange={(e) => setSeed(e.target.value)} />
            <div className="mt-1.5 text-xs text-muted">Same seed → same ASR noise and latency jitter. Change it to explore variance; keep it fixed in CI.</div>
          </div>
          <button className="btn-primary w-full justify-center" disabled={busy || selected.size === 0} onClick={start}>
            {busy ? progress : `▶ Run ${selected.size} scenario${selected.size === 1 ? "" : "s"}`}
          </button>
          {error && <div className="text-sm text-rose-300">{error}</div>}
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Scenarios ({selected.size} selected)</div>
            <div className="flex gap-2 text-xs">
              <button className="text-accent hover:underline" onClick={() => setSelected(new Set(library.map((s) => s.id)))}>
                all
              </button>
              <button className="text-accent hover:underline" onClick={() => setSelected(new Set())}>
                none
              </button>
              {categories.map((c) => (
                <button key={c} className="text-muted hover:text-ink" onClick={() => setSelected(new Set(library.filter((s) => s.category === c).map((s) => s.id)))}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {library.map((s) => (
              <label key={s.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selected.has(s.id) ? "border-line bg-panel" : "border-line/50 bg-panel/40 opacity-60"}`}>
                <input type="checkbox" className="mt-1" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{s.name}</span>
                    <CategoryPill category={s.category} />
                    {s.origin === "production" && <span className="pill border-violet-400/40 bg-violet-400/10 text-violet-300">from production</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {s.persona.name}, {s.persona.age} · {s.persona.accent} · {s.persona.mood}
                    {s.stressors.length ? ` · stressors: ${s.stressors.join(", ")}` : ""}
                  </div>
                  <div className="mt-0.5 text-xs text-ink/80">{s.goal}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
