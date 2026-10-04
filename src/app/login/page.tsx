"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/shell";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("demo@soundcheck.ai");
  const [password, setPassword] = useState("soundcheck123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Login failed");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
      <div>
        <label className="mb-1 block text-xs text-muted">Email</label>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </div>
      {error && <div className="text-sm text-rose-300">{error}</div>}
      <button className="btn-primary w-full justify-center" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <div className="rounded-lg border border-line bg-panel-2 p-3 text-xs text-muted">
        Demo credentials are pre-filled: <span className="mono text-ink">demo@soundcheck.ai</span> / <span className="mono text-ink">soundcheck123</span>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Logo size="lg" />
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="max-w-xs text-center text-xs text-muted">Red-team, rehearse, and certify AI voice agents before they talk to a real customer.</p>
      </div>
    </div>
  );
}
