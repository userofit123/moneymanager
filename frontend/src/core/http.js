// Every call to the server goes through here, like the fetch wrapper at the top of web/js/01-prefs-theme.js:
// the session cookie is always sent, changes carry the header the server asks for (it refuses them without it),
// and a lost session shows the sign-in screen.
import { ref } from "vue";

// True when the server said the session is gone (App.vue then shows the sign-in screen).
export const signedOut = ref(false);

export async function request(url, opt = {}) {
  const o = { ...opt, credentials: "same-origin" };
  const m = String(o.method || "GET").toUpperCase();
  if (m !== "GET" && m !== "HEAD") o.headers = { ...(o.headers || {}), "x-requested-with": "money" };
  const r = await fetch(url, o);
  const u = String(url);
  if (r.status === 401 && u.startsWith("/api/") && !u.startsWith("/api/auth/")) signedOut.value = true;
  return r;
}

// fetch options for a JSON body: request("/x", sendJson("PUT", { a: 1 }))
export const sendJson = (method, body) => ({ method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

// GET that returns the JSON, or throws.
export async function getJson(url) {
  const r = await request(url, { cache: "no-store" });
  if (!r.ok) throw new Error(url + " " + r.status);
  return r.json();
}
