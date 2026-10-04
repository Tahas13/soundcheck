"use client";

import type { Severity } from "@/lib/types";

export function scoreColor(score: number) {
  if (score >= 85) return "var(--color-ok)";
  if (score >= 60) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function ScoreRing({ score, size = 96, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill={color} fontSize={size / 3.2} fontWeight={700} className="mono">
          {score}
        </text>
      </svg>
      {label && <span className="text-xs text-muted">{label}</span>}
    </div>
  );
}

export function SeverityPill({ severity }: { severity: Severity }) {
  const cls = severity === "critical" ? "border-rose-400/40 text-rose-300 bg-rose-400/10" : severity === "major" ? "border-amber-400/40 text-amber-300 bg-amber-400/10" : "border-slate-400/40 text-slate-300 bg-slate-400/10";
  return <span className={`pill ${cls}`}>{severity}</span>;
}

export function GatePill({ gate }: { gate: "pass" | "fail" }) {
  return gate === "pass" ? (
    <span className="pill border-emerald-400/40 bg-emerald-400/10 text-emerald-300">gate: pass</span>
  ) : (
    <span className="pill border-rose-400/40 bg-rose-400/10 text-rose-300">gate: blocked</span>
  );
}

export function PassPill({ passed }: { passed: boolean }) {
  return passed ? <span className="pill border-emerald-400/40 bg-emerald-400/10 text-emerald-300">pass</span> : <span className="pill border-rose-400/40 bg-rose-400/10 text-rose-300">fail</span>;
}

export function CategoryPill({ category }: { category: string }) {
  const map: Record<string, string> = {
    "happy-path": "border-cyan-400/40 text-cyan-300 bg-cyan-400/10",
    stress: "border-violet-400/40 text-violet-300 bg-violet-400/10",
    adversarial: "border-rose-400/40 text-rose-300 bg-rose-400/10",
    compliance: "border-amber-400/40 text-amber-300 bg-amber-400/10",
    safety: "border-orange-400/40 text-orange-300 bg-orange-400/10",
    grounding: "border-emerald-400/40 text-emerald-300 bg-emerald-400/10",
  };
  return <span className={`pill ${map[category] ?? "border-slate-400/40 text-slate-300"}`}>{category}</span>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : tone === "bad" ? "text-rose-300" : "text-ink";
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className={`mono mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="text-sm font-medium">{title}</div>
      {body && <div className="max-w-md text-xs text-muted">{body}</div>}
    </div>
  );
}
