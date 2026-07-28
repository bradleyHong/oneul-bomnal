import { cookieHeader } from "./_auth.js";

export const config = { runtime: "edge" };

export default async function handler() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": cookieHeader("", { clear: true }),
    },
  });
}
