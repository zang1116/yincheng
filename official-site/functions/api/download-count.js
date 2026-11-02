const VERSION = "2.3.5";
const COUNTER_KEY = "official-site:downloads";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export async function onRequestGet({ env }) {
  try {
    const stored = Number(await env.DOWNLOAD_COUNTER.get(COUNTER_KEY));
    return new Response(JSON.stringify({
      count: Number.isFinite(stored) ? Math.max(0, stored) : 0,
      version: VERSION,
    }), { status: 200, headers });
  } catch (error) {
    console.error("download-count failed", error);
    return new Response(JSON.stringify({ error: "counter_unavailable" }), { status: 503, headers });
  }
}
