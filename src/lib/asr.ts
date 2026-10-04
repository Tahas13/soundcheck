import type { Stressor } from "./types";

/**
 * Simulates speech-to-text degradation at the text level.
 * In the full product this is replaced by real TTS -> noise/accent augmentation -> STT
 * (Kokoro/Piper -> audiomentations -> faster-whisper). The text-level simulator reproduces the
 * most common failure class we see from Whisper on noisy phone audio: number homophones and
 * dropped function words.
 */
const HOMOPHONES: Record<string, string> = {
  four: "for",
  eight: "ate",
  two: "to",
  one: "won",
  three: "tree",
  tonight: "to night",
  please: "pleas",
  reservation: "reservations",
};

const DROPPABLE = new Set(["the", "a", "an", "please", "just", "um", "uh"]);

export function degrade(text: string, stressors: Stressor[], rng: () => number): string | undefined {
  const noisy = stressors.includes("background-noise") || stressors.includes("mishearing");
  if (!noisy) return undefined;
  const out: string[] = [];
  for (const raw of text.split(/\s+/)) {
    const core = raw.toLowerCase().replace(/[^a-z']/g, "");
    const punct = raw.replace(/[a-zA-Z']/g, "");
    if (DROPPABLE.has(core) && rng() < 0.35) continue;
    if (HOMOPHONES[core]) {
      out.push(HOMOPHONES[core] + punct.replace(/[.,!?]/g, ""));
      continue;
    }
    out.push(raw);
  }
  // Noise also strips punctuation ASR would not reliably recover.
  return out.join(" ").replace(/[.,!?]+/g, "").toLowerCase();
}
