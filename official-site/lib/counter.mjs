import { getStore } from "@netlify/blobs";

const STORE_NAME = "yincheng-download-counter";
const COUNTER_KEY = "downloads.json";
const VERSION = "2.3.5";

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function readCounter() {
  const data = await store().get(COUNTER_KEY, { type: "json" });
  return {
    count: Number.isFinite(Number(data?.count)) ? Math.max(0, Number(data.count)) : 0,
    updatedAt: typeof data?.updatedAt === "string" ? data.updatedAt : "",
    version: VERSION,
  };
}

export async function incrementCounter() {
  const current = await readCounter();
  const next = {
    count: current.count + 1,
    updatedAt: new Date().toISOString(),
    version: VERSION,
  };
  await store().setJSON(COUNTER_KEY, next);
  return next;
}
