"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { BUILTIN_AGENTS } from "@/lib/agents";
import { useCustomAgents } from "@/lib/store";
import type { AgentDef } from "@/lib/types";

export default function AgentsPage() {
  const { agents, addAgent, removeAgent } = useCustomAgents();
  const [form, setForm] = useState({ name: "", version: "v1", baseUrl: "", apiKey: "", model: "", systemPrompt: "" });
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a: AgentDef = {
      id: `ext_${form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}_${Date.now().toString(36)}`,
      name: form.name,
      version: form.version,
      kind: "external",
      description: `OpenAI-compatible endpoint · ${form.model}`,
      external: { baseUrl: form.baseUrl, apiKey: form.apiKey || undefined, model: form.model, systemPrompt: form.systemPrompt || undefined },
    };
    addAgent(a);
    setOpen(false);
    setForm({ name: "", version: "v1", baseUrl: "", apiKey: "", model: "", systemPrompt: "" });
  };

  return (
    <div>
      <PageHeader
        title="Target agents"
        subtitle="The systems under test. Built-in agents run inside the simulator. External agents are any OpenAI-compatible chat endpoint (vLLM, Ollama, Groq, your own gateway); Soundcheck sends the standard booking tool schema and measures real round-trip latency."
        actions={
          <button className="btn-primary" onClick={() => setOpen((o) => !o)}>
            + Register external agent
          </button>
        }
      />

      {open && (
        <form onSubmit={submit} className="card mb-6 grid gap-3 p-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Name</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hilda staging" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Version label</label>
            <input className="input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Base URL (OpenAI-compatible)</label>
            <input className="input mono" required value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://api.groq.com/openai/v1" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Model</label>
            <input className="input mono" required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="llama-3.3-70b-versatile" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-muted">API key (stored only in this browser)</label>
            <input className="input mono" type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-muted">System prompt (optional — defaults to the Bella Napoli receptionist prompt with the KB)</label>
            <textarea className="input min-h-24" value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} />
          </div>
          <div className="flex gap-2 md:col-span-2">
            <button className="btn-primary">Save agent</button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {[...BUILTIN_AGENTS, ...agents].map((a) => (
          <div key={a.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">
                  {a.name} <span className="text-muted">· {a.version}</span>
                </div>
                <div className="mt-1 text-xs text-muted">{a.description}</div>
              </div>
              <span className="pill border-line text-muted">{a.kind}</span>
            </div>
            {a.external && (
              <div className="mono mt-2 truncate text-xs text-muted">
                {a.external.baseUrl} · {a.external.model}
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs">
              <Link href="/runs/new" className="text-accent hover:underline">
                Run suite →
              </Link>
              {a.kind === "builtin" && (
                <a href={`/api/badge/${a.id}`} target="_blank" className="text-accent hover:underline">
                  CI badge ↗
                </a>
              )}
              {a.kind === "external" && (
                <button className="text-rose-300 hover:underline" onClick={() => removeAgent(a.id)}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
