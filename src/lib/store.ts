"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { AgentDef, Run, Scenario } from "./types";

/**
 * MVP persistence: browser localStorage behind useSyncExternalStore. The production design
 * uses PostgreSQL + MinIO (see /architecture). Keeping the MVP stateless server-side lets it
 * run on any free host.
 */
const KEYS = { runs: "sc.runs.v1", agents: "sc.agents.v1", scenarios: "sc.scenarios.v1", promoted: "sc.promoted.v1" } as const;

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot<T>(key: string, fallback: T): T {
  const raw = window.localStorage.getItem(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  listeners.forEach((l) => l());
}

const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
export function useOrigin() {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

function useKey<T>(key: string, fallback: T): [T, (updater: (prev: T) => T) => void, boolean] {
  const value = useSyncExternalStore(subscribe, () => snapshot(key, fallback), () => fallback);
  const ready = useHydrated();
  const update = useCallback((updater: (prev: T) => T) => write(key, updater(snapshot(key, fallback))), [key, fallback]);
  return [value, update, ready];
}

const EMPTY_RUNS: Run[] = [];
const EMPTY_AGENTS: AgentDef[] = [];
const EMPTY_SCENARIOS: Scenario[] = [];
const EMPTY_PROMOTED: string[] = [];

export function useRuns() {
  const [runs, update, ready] = useKey<Run[]>(KEYS.runs, EMPTY_RUNS);
  const saveRun = useCallback((run: Run) => update((prev) => [run, ...prev.filter((r) => r.id !== run.id)].slice(0, 50)), [update]);
  const clear = useCallback(() => update(() => []), [update]);
  return { runs, saveRun, clear, ready };
}

export function useCustomAgents() {
  const [agents, update, ready] = useKey<AgentDef[]>(KEYS.agents, EMPTY_AGENTS);
  const addAgent = useCallback((a: AgentDef) => update((prev) => [...prev.filter((x) => x.id !== a.id), a]), [update]);
  const removeAgent = useCallback((id: string) => update((prev) => prev.filter((x) => x.id !== id)), [update]);
  return { agents, addAgent, removeAgent, ready };
}

export function useCustomScenarios() {
  const [scenarios, update, ready] = useKey<Scenario[]>(KEYS.scenarios, EMPTY_SCENARIOS);
  const addScenario = useCallback((s: Scenario) => update((prev) => [...prev.filter((x) => x.id !== s.id), s]), [update]);
  return { scenarios, addScenario, ready };
}

export function usePromoted() {
  const [promoted, update, ready] = useKey<string[]>(KEYS.promoted, EMPTY_PROMOTED);
  const promote = useCallback((callId: string) => update((prev) => (prev.includes(callId) ? prev : [...prev, callId])), [update]);
  return { promoted, promote, ready };
}

const SEED_AGENTS = ["bella-v1", "bella-v2"];

/** Ensure the two seeded demo runs exist so the dashboard is never empty. */
export function useSeedRuns() {
  const { runs, saveRun, ready } = useRuns();
  const inflight = useRef(new Set<string>());
  const missing = useMemo(() => (ready ? SEED_AGENTS.filter((id) => !runs.some((r) => r.id === `seed-${id}`)) : []), [ready, runs]);

  useEffect(() => {
    for (const id of missing) {
      if (inflight.current.has(id)) continue;
      inflight.current.add(id);
      fetch(`/api/runs/seed?agent=${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((run: Run | null) => {
          if (run) saveRun(run);
        })
        .finally(() => inflight.current.delete(id));
    }
  }, [missing, saveRun]);

  return { seeding: missing.length > 0 };
}
