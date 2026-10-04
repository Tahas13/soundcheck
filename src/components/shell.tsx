"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◧" },
  { href: "/runs/new", label: "New run", icon: "▶" },
  { href: "/scenarios", label: "Scenario library", icon: "☰" },
  { href: "/agents", label: "Target agents", icon: "☎" },
  { href: "/monitor", label: "Production monitor", icon: "◉" },
  { href: "/ci", label: "CI gate", icon: "⛉" },
  { href: "/architecture", label: "Architecture", icon: "⬡" },
];

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`grid place-items-center rounded-lg bg-accent text-black font-black ${size === "lg" ? "h-10 w-10 text-lg" : "h-8 w-8 text-sm"}`}>S</div>
      <div>
        <div className={`font-semibold tracking-tight ${size === "lg" ? "text-xl" : "text-sm"}`}>Soundcheck</div>
        {size === "lg" && <div className="text-xs text-muted">QA & monitoring for AI voice agents</div>}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-panel/60 p-4 md:flex">
        <Link href="/" className="mb-6 block">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-accent/10 text-accent" : "text-muted hover:bg-panel-2 hover:text-ink"}`}>
                <span className="w-4 text-center text-xs">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-lg border border-line bg-panel-2 p-3 text-xs">
          <div className="text-ink">Demo workspace</div>
          <div className="text-muted">demo@soundcheck.ai</div>
          <button onClick={logout} className="mt-2 text-accent hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Logo />
          <button onClick={logout} className="text-xs text-accent">
            Sign out
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs ${path === n.href ? "bg-accent/10 text-accent" : "text-muted"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
