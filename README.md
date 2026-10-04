# Soundcheck

**Red-team, rehearse, and certify AI voice agents before they talk to a real customer.**

Businesses are putting AI agents on the phone with their customers, but almost nobody checks whether those agents are honest, safe and consistent before go-live, or notices when they quietly degrade after a prompt change. Soundcheck is the QA, regression-testing and monitoring layer for voice (and chat) agents.

## What it does

1. **Synthetic caller simulation** – personas (age, accent, language, mood) plus stressors (background noise, interruptions, Urdu/English code-switching, fragmented speech, hostile tone, prompt injection) run scripted goals against the target agent.
2. **Scoring beyond the transcript** – task completion is verified against **tool calls / side effects** (did the booking actually land?), facts are checked against the business knowledge base, plus latency, escalation, compliance (AI disclosure, PCI read-back) and a tone/empathy judge.
3. **CI gate** – `POST /api/runs` returns a pass/block verdict; `GET /api/badge/:agentId` serves an SVG badge. Score ≥ 85 and zero critical failures or the deploy is blocked.
4. **Production shadow monitor** – samples live calls, runs the same judges, detects drift, and lets you promote any real failure into a permanent regression scenario in one click.
5. **Shareable Report Card** – a public link the agency hands to the business owner.

## Demo

- **Login:** `demo@soundcheck.ai` / `soundcheck123`
- Two built-in target agents: `Bella Napoli Receptionist v1.3` (deliberately flawed) and `v2.0` (patched). The dashboard runs the same 14 scenarios against both so you can see regression detection and the gate in action.
- Register any OpenAI-compatible endpoint (vLLM, Ollama, Groq, your own gateway) as an external agent; Soundcheck sends the booking tool schema and measures real latency.

## Running locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Optional LLM judge (any OpenAI-compatible endpoint; defaults target Groq + Llama 3.3 70B):

```bash
cp .env.example .env.local   # then set LLM_API_KEY
```

Without a key the tone judge falls back to a heuristic; every other judge is rule-based and deterministic.

## Architecture

See [`docs/architecture.mmd`](docs/architecture.mmd) (also rendered in-app at `/architecture` with a production → MVP mapping table).

Production stack (all open source): Pipecat / LiveKit Agents, Asterisk, faster-whisper, Kokoro / Piper / XTTS, audiomentations, Qwen / Llama on vLLM, LangGraph, DeepEval / Promptfoo, Langfuse, FastAPI, Temporal, PostgreSQL + pgvector, MinIO, Prometheus + Grafana, Next.js.

## Project layout

```
src/lib/agents.ts      built-in target agents (v1 flawed, v2 patched)
src/lib/scenarios.ts   scenario library (persona + stressors + goal + expectations)
src/lib/asr.ts         text-level ASR degradation simulator
src/lib/judges.ts      rule / heuristic / LLM judges with evidence
src/lib/engine.ts      run orchestration, scoring, gate, failure clustering
src/lib/external.ts    OpenAI-compatible adapter for external agents
src/lib/monitor.ts     production shadow-monitor data
src/app/api/*          runs, seed runs, badge, auth, health
src/app/(app)/*        dashboard, runs, scenarios, agents, monitor, CI, architecture
src/app/report/[id]    public report card
```
