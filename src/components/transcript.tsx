"use client";

import { useEffect, useRef, useState } from "react";
import type { Turn } from "@/lib/types";

/**
 * Transcript viewer with a "listen" mode that plays the call using the browser's speech
 * synthesis, alternating voices for caller and agent. In the full product this plays the real
 * synthesized audio (Kokoro/Piper personas + the agent's TTS) stored in MinIO.
 */
export function Transcript({ turns, compact = false }: { turns: Turn[]; compact?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const play = async () => {
    if (!("speechSynthesis" in window)) return;
    if (playing) {
      cancelRef.current = true;
      window.speechSynthesis.cancel();
      setPlaying(false);
      setCurrent(null);
      return;
    }
    cancelRef.current = false;
    setPlaying(true);
    const voices = window.speechSynthesis.getVoices();
    const en = voices.filter((v) => v.lang.startsWith("en"));
    const callerVoice = en[1] ?? en[0];
    const agentVoice = en.find((v) => /female|zira|samantha|aria|jenny/i.test(v.name)) ?? en[0];
    for (let i = 0; i < turns.length; i++) {
      if (cancelRef.current) break;
      const t = turns[i];
      setCurrent(i);
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(t.heardAs && t.role === "caller" ? t.text : t.text);
        u.voice = (t.role === "caller" ? callerVoice : agentVoice) ?? null;
        u.rate = t.role === "caller" ? 1.0 : 1.05;
        u.pitch = t.role === "caller" ? 0.9 : 1.1;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      });
      const lat = t.latencyMs ?? 0;
      if (t.role === "agent" && lat) await new Promise((r) => setTimeout(r, Math.min(600, lat / 4)));
    }
    setPlaying(false);
    setCurrent(null);
  };

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs text-muted">
            {turns.length} turns · caller lines marked <span className="mono text-amber-300">heard as</span> show what the agent received after simulated ASR noise
          </div>
          <button className="btn-ghost text-xs" onClick={play}>
            {playing ? "■ Stop" : "▶ Listen to call"}
          </button>
        </div>
      )}
      <ol className="space-y-2">
        {turns.map((t, i) => (
          <li key={i} className={`flex ${t.role === "agent" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${t.role === "agent" ? "bg-panel-2 border border-line" : "bg-cyan-400/10 border border-cyan-400/20"} ${current === i ? "ring-2 ring-accent/60" : ""}`}>
              <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted">
                <span>{t.role === "agent" ? "Agent" : "Caller"}</span>
                {t.latencyMs !== undefined && <span className={`mono ${t.latencyMs > 1500 ? "text-rose-300" : t.latencyMs > 1000 ? "text-amber-300" : "text-emerald-300"}`}>{t.latencyMs} ms</span>}
              </div>
              <div>{t.text}</div>
              {t.heardAs && t.heardAs.toLowerCase() !== t.text.toLowerCase().replace(/[.,!?]+/g, "") && (
                <div className="mono mt-1.5 text-xs text-amber-300/90">heard as: “{t.heardAs}”</div>
              )}
              {t.toolCalls && t.toolCalls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {t.toolCalls.map((c, j) => (
                    <div key={j} className="mono rounded-md border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-[11px] text-violet-200">
                      ⚙ {c.name}({JSON.stringify(c.args)})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
