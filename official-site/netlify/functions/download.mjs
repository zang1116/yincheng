import { incrementCounter } from "../../lib/counter.mjs";

const APK_PATH = "/download/yincheng-2.3.5.apk";

export default async function handler(request) {
  if (request.method !== "HEAD") {
    try {
      await incrementCounter();
    } catch (error) {
      // A storage issue must never block someone from getting the app.
      console.error("download counter increment failed", error);
    }
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: APK_PATH,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
