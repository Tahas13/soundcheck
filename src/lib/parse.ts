/** Small NLU helpers shared by the built-in demo agents. */

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
  // Common ASR homophones
  to: 2, too: 2, for: 4, ate: 8, won: 1, tree: 3, free: 3,
  // Roman Urdu
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chay: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10,
};

export interface Parsed {
  partySizes: number[];
  hour24?: number;
  name?: string;
  day?: string;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/**
 * @param lenient when true, also accepts homophones and Roman Urdu numerals.
 */
export function parseUtterance(text: string, lenient: boolean): Parsed {
  const t = text.toLowerCase();
  const partySizes: number[] = [];

  // "table for 4", "4 people", "party of six", "6 logon", "4 log"
  const re = /(?:table for|party of|for|group of|hum|ham)\s+(\w+)|(\w+)\s+(?:people|persons|guests|of us|logon|log|bande|banday|afraad)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const tok = m[1] ?? m[2];
    const n = toNumber(tok, lenient);
    if (n && n <= 20) partySizes.push(n);
  }
  // Correction patterns: "actually six", "make that 6", "no, 6"
  const corr = /(?:actually|make that|make it|no,?|sorry,?|change (?:that|it) to)\s+(\w+)/g;
  while ((m = corr.exec(t))) {
    const n = toNumber(m[1], lenient);
    if (n && n <= 20) partySizes.push(n);
  }

  // Time: "8 pm", "8pm", "at 8", "19:30", "3 in the morning", "8 baje"
  let hour24: number | undefined;
  const tm = /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|baje|o'clock|in the morning|in the evening|tonight)?/g;
  while ((m = tm.exec(t))) {
    const h = parseInt(m[1], 10);
    const mod = (m[3] ?? "").replace(/\./g, "");
    if (h < 1 || h > 24) continue;
    // Skip phone-number-ish / card-ish digit runs
    if (m[2] === undefined && /\d{3,}/.test(t.slice(m.index, m.index + 5))) continue;
    if (mod === "am" || mod === "in the morning") hour24 = h === 12 ? 0 : h;
    else if (mod === "pm" || mod === "in the evening" || mod === "tonight") hour24 = h === 12 ? 12 : h + 12;
    else if (mod === "baje" || mod === "o'clock") hour24 = h < 11 ? h + 12 : h; // assume evening for a restaurant
    else if (/\bat\s+\d/.test(t) && hour24 === undefined) hour24 = h < 11 ? h + 12 : h;
  }
  // Word-based hours ("eight pm", "ate pm", "aath baje", "seven in the evening"). Lenient only.
  if (hour24 === undefined && lenient) {
    const wm = /\b([a-z]+)\s+(pm|am|baje|o'clock|in the evening|in the morning|tonight)\b/.exec(t);
    if (wm) {
      const n = toNumber(wm[1], true);
      if (n && n >= 1 && n <= 12) {
        if (wm[2] === "am" || wm[2] === "in the morning") hour24 = n === 12 ? 0 : n;
        else hour24 = n === 12 ? 12 : n < 11 ? n + 12 : n;
      }
    }
  }

  // Name: "name is Ali", "under Sara", "it's Ahmed"
  let name: string | undefined;
  const nm = /(?:name is|under|name's|it's|this is|mera naam)\s+([A-Za-z]+)/i.exec(text);
  if (nm && !["a", "an", "the", "calling", "ridiculous"].includes(nm[1].toLowerCase())) name = nm[1];

  const day = DAYS.find((d) => t.includes(d));
  return { partySizes, hour24, name, day };
}

export function toNumber(tok: string, lenient: boolean): number | undefined {
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  const strict = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  if (strict.includes(tok)) return NUM_WORDS[tok];
  if (lenient) return NUM_WORDS[tok];
  return undefined;
}

export const CARD_RE = /\b(?:\d[ -]?){13,16}\b/;
