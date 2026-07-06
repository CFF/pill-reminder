import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// --- Hardening (audit 2026-07) ---
const ALLOWED_ORIGIN = "https://cff.github.io"; // dev and prod are both served from here
const MAX_BODY_BYTES = 12 * 1024 * 1024;        // ~12 MB: fits a full phone photo, blocks abusive payloads
const MAX_TOKENS_CAP = 600;                      // server-side hard cap; any client value is ignored

// Locked scope. Always prepended before any client-supplied system prompt; never replaced.
const SYSTEM_PREFIX =
  "You are the assistant built into Posology, a personal medication-tracking app. " +
  "Your only purposes are helping the user manage their medications and answer general " +
  "health questions, and reading medication or pharmacy labels from images. " +
  "Politely decline anything outside that scope. " +
  "When the user's message specifies an exact output format, follow it precisely.";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (obj: unknown, status: number) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const bodyText = await req.text();
    if (bodyText.length > MAX_BODY_BYTES) {
      return json({ error: "request too large" }, 413);
    }

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return json({ error: "invalid JSON" }, 400);
    }

    const { messages, system } = body ?? {};

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "key not configured" }, 500);
    }

    const clientSystem = typeof system === "string" ? system : "";
    const finalSystem = clientSystem ? `${SYSTEM_PREFIX}\n\n${clientSystem}` : SYSTEM_PREFIX;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: MAX_TOKENS_CAP,
        system: finalSystem,
        messages,
      }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.status,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
