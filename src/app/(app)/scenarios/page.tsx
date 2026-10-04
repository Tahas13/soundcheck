"use client";

import { useState } from "react";
import { CategoryPill, PageHeader, SeverityPill } from "@/components/ui";
import { CHECK_LABELS } from "@/lib/judges";
import { SCENARIOS } from "@/lib/scenarios";
import { useCustomScenarios } from "@/lib/store";
import type { Scenario } from "@/lib/types";

export default function ScenariosPage() {
  const { scenarios: promoted } = useCustomScenarios();
  const all: Scenario[] = [...SCENARIOS, ...promoted];
  const [cat, setCat] = useState<string>("all");
  const cats = ["all", ...new Set(all.map((s) => s.category))];
  const shown = cat === "all" ? all : all.filter((s) => s.category === cat);

  return (
    <div>
      <PageHeader
        title="Scenario library"
        subtitle="A scenario is a persona (age, accent, language, mood) + acoustic/behavioural stressors + a goal + expectations. Expectations are verified against side effects (tool calls) wherever possible, so an agent can't pass by sounding confident."
      />
      <div className="mb-4 flex flex-wrap gap-1">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-md px-2.5 py-1 text-xs ${cat === c ? "bg-accent/10 text-accent" : "text-muted hover:text-ink"}`}>
            {c} {c === "all" ? `(${all.length})` : `(${all.filter((s) => s.category === c).length})`}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <div className="text-sm font-medium">{s.name}</div>
              <CategoryPill category={s.category} />
              {s.origin === "production" && <span className="pill border-violet-400/40 bg-violet-400/10 text-violet-300">from production</span>}
            </div>
            <div className="text-xs text-muted">
              <span className="text-ink">{s.persona.name}</span>, {s.persona.age} · {s.persona.accent} · {s.persona.language} · mood: {s.persona.mood}
            </div>
            <div className="mt-1 text-xs text-muted">{s.persona.description}</div>
            {s.stressors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {s.stressors.map((x) => (
                  <span key={x} className="pill border-violet-400/40 bg-violet-400/10 text-violet-300">
                    {x}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 text-xs">
              <span className="text-muted">Goal: </span>
              {s.goal}
            </div>
            <div className="mt-2 space-y-1 rounded-lg border border-line bg-panel-2 p-2.5">
              {s.script.map((line, i) => (
                <div key={i} className="text-xs">
                  <span className="mono text-muted">C{i + 1}</span> {line}
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {s.expectations.map((e) => (
                <div key={e.check} className="flex items-center justify-between gap-2 text-xs">
                  <span>{CHECK_LABELS[e.check]}</span>
                  <SeverityPill severity={e.severity} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
