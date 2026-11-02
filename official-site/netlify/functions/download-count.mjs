import { readCounter } from "../../lib/counter.mjs";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

export default async function handler() {
  try {
    return new Response(JSON.stringify(await readCounter()), { status: 200, headers });
  } catch (error) {
    console.error("download-count failed", error);
    return new Response(JSON.stringify({ error: "counter_unavailable" }), { status: 503, headers });
  }
}
