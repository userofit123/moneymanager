// Allowlist egress proxy for the scraper. The scraper container has no direct internet access in strict mode:
// its browser can only reach hosts listed in EGRESS_ALLOW (and their subdomains). Everything else is refused and
// logged by hostname only (never paths, queries or bodies), so you can see what a bank page tried to load.
import http from "node:http";
import net from "node:net";
import dns from "node:dns/promises";

const ALLOW = (process.env.EGRESS_ALLOW || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const ALLOW_PRIVATE = process.env.EGRESS_ALLOW_PRIVATE === "1"; // tests only
const PORT = +process.env.PORT || 3128;

export const hostAllowed = (host, list = ALLOW) => {
  host = String(host).toLowerCase().replace(/\.$/, "");
  return list.some((d) => host === d || host.endsWith("." + d));
};
export const isPrivateIp = (ip) =>
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip) ||
  ip === "::1" || /^f[cd]/i.test(ip) || /^fe80/i.test(ip) || /^::ffff:(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(ip);

const seen = new Set();
const log = (verdict, host) => { const k = verdict + host; if (!seen.has(k)) { seen.add(k); console.log(`${verdict} ${host}`); } };

export function createProxy() {
  const server = http.createServer((req, res) => { // plain http is never needed for bank logins
    log("BLOCKED(http)", String(req.headers.host || "?").split(":")[0]);
    res.writeHead(403); res.end("blocked");
  });
  server.on("connect", async (req, client, head) => {
    const [host, port] = req.url.split(":");
    const deny = (why) => { log(why, host); client.end("HTTP/1.1 403 Forbidden\r\n\r\n"); };
    if (!hostAllowed(host) || +port !== 443) return deny("BLOCKED");
    try {
      const addrs = await dns.lookup(host, { all: true });
      const ok = addrs.find((a) => ALLOW_PRIVATE || !isPrivateIp(a.address)); // an allowed name must not point inside your network
      if (!ok) return deny("BLOCKED(private-ip)");
      const up = net.connect(+port, ok.address, () => { log("allowed", host); client.write("HTTP/1.1 200 Connection Established\r\n\r\n"); up.write(head); up.pipe(client); client.pipe(up); });
      up.on("error", () => client.destroy()); client.on("error", () => up.destroy());
    } catch { deny("BLOCKED(dns)"); }
  });
  return server;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  if (!ALLOW.length) { console.error("EGRESS_ALLOW is empty: refusing to start with nothing allowed"); process.exit(1); }
  createProxy().listen(PORT, () => console.log(`egress proxy on :${PORT}, allowing: ${ALLOW.join(", ")}`));
}
