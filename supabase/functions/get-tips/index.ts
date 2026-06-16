import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pillsDesc } = await req.json();
    if (!pillsDesc) return new Response(JSON.stringify({ error: "missing pillsDesc" }), { status: 400, headers: corsHeaders });

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) return new Response(JSON.stringify({ error: "key not configured" }), { status: 500, headers: corsHeaders });

    const sys = `You are a clinical pharmacist assistant. Given a list of medications a patient is currently taking, return a JSON array of tip cards.

Rules:
- One card per medication PLUS one optional "Interactions" card if relevant interactions exist between the listed drugs.
- Each card: { "label": string, "colorKey": "orange"|"blue"|"green"|"red"|"purple", "points": [{icon: string, text: string}] }
- icon must be one of: AlertTriangle, Pill, GlassWater, Car, Utensils, Waves, Timer, Bone, Salad
- Each card: 3-5 points max. Be specific and actionable.
- For max dose: always calculate in terms of the exact dose provided. E.g. if Tylenol 500mg: say "Do NOT exceed 4,000 mg/day — that is 8 tablets of 500 mg".
- Focus on: daily life impact, critical safety limits, interactions with food/alcohol, what to watch for.
- Do NOT include obvious generic advice. Be specific and clinically useful.
- Return ONLY the JSON array. No preamble, no markdown, no explanation.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: sys,
        messages: [{ role: "user", content: "My current medications:\n" + pillsDesc }],
      }),
    });

    const data = await res.json();
    const raw = data.content?.[0]?.text || "[]";
    const clean = raw.replace(/^```json\n?|^```\n?|\n?```$/g, "").trim();
    const tips = JSON.parse(clean);

    return new Response(JSON.stringify(tips), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
