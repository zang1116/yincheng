const APK_PATH = "/download/yincheng-2.3.5.apk";
const COUNTER_KEY = "official-site:downloads";

export async function onRequestGet({ env, request }) {
  try {
    const stored = Number(await env.DOWNLOAD_COUNTER.get(COUNTER_KEY));
    const next = Number.isFinite(stored) ? Math.max(0, stored) + 1 : 1;
    await env.DOWNLOAD_COUNTER.put(COUNTER_KEY, String(next));
  } catch (error) {
    // Storage failures must never block the APK download.
    console.error("download counter increment failed", error);
  }
  return Response.redirect(new URL(APK_PATH, request.url).toString(), 302);
}

export async function onRequestHead({ request }) {
  return Response.redirect(new URL(APK_PATH, request.url).toString(), 302);
}

export async function onRequest({ request }) {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
  });
}
