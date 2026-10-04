import { resolveAgent, runSuite } from "@/lib/engine";

/** Shields-style SVG badge for READMEs / PR checks: /api/badge/bella-v2 */
export async function GET(_req: Request, ctx: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await ctx.params;
  const agent = resolveAgent(agentId);
  let label = "soundcheck";
  let value = "unknown";
  let color = "#6b7280";
  if (agent && agent.kind === "builtin") {
    const run = await runSuite({ agent, seed: "default" });
    value = `${run.summary.gate === "pass" ? "passing" : "failing"} · ${run.summary.score}/100`;
    color = run.summary.gate === "pass" ? "#16a34a" : "#dc2626";
    label = `soundcheck ${agent.version.split(" ")[0]}`;
  }
  const lw = label.length * 6.6 + 12;
  const vw = value.length * 6.6 + 12;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + vw}" height="20" role="img" aria-label="${label}: ${value}">
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${lw + vw}" height="20" rx="3" fill="#fff"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="20" fill="#555"/><rect x="${lw}" width="${vw}" height="20" fill="${color}"/><rect width="${lw + vw}" height="20" fill="url(#s)"/></g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
<text x="${lw / 2}" y="14">${label}</text><text x="${lw + vw / 2}" y="14">${value}</text></g></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "no-cache" } });
}
