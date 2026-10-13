// Fake sample data, relative to today, so every screen can be tried (and photographed) before a bank is connected.
//   Docker:  docker compose -f docker-compose.yml -f docker-compose.demo.yml up --build     (loads it into an empty database)
//   Any:     node src/cli.js demo
// Everything is invented. It is only ever loaded into a database with no transactions.
import { tx, audit, bumpRev } from "./db.js";

const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const iso = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const round = (n) => Math.round(n);

export function buildDemo(today = new Date()) {
  const T = iso(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const rows = [];
  const add = (r) => { if (r.d <= T) rows.push({ tags: [], ...r }); };
  const out = (d, acct, to, a, c, extra = {}) => add({ d, desc: to, from: acct, to, a: -Math.abs(a), c, ...extra });
  const inc = (d, from, acct, a, c, extra = {}) => add({ d, desc: extra.desc || from, from, to: acct, a: Math.abs(a), c, ...extra });
  const B = "Bank Hapoalim", MAX = "Max", ISR = "Isracard", W = "Wise";

  for (let k = 13; k >= 0; k--) {
    const base = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - k, 1));
    const y = base.getUTCFullYear(), m = base.getUTCMonth(), r = mulberry(y * 100 + m + 7);
    const day = (d) => iso(y, m, Math.min(d, 28));
    const pick = (a) => a[Math.floor(r() * a.length)];
    const amt = (lo, hi) => round(lo + r() * (hi - lo));

    // ---- bank
    inc(day(9), "Wix.com Ltd", B, k > 6 ? 17900 : 18900, "Salary", { desc: "Salary – Wix.com", tags: ["salary"] });
    out(day(1), B, "Rent – Cohen", 5600, "Rent & housing", { tags: ["fixed"] });
    out(day(2), B, "Holmes Place", 259, "Entertainment & leisure");
    out(day(4), B, "Bezeq", 99, "Phone & internet", { tags: ["fixed"] });
    out(day(12), B, "Maccabi", 420, "Health & pharmacy");
    out(day(11), B, "To savings", 1500, "Savings & investments");
    out(day(20), B, "Israel Electric Corp", amt(300, 540), "Bills & utilities");
    if (m % 2 === 0) { out(day(15), B, "Tel Aviv Municipality", 780, "Bills & utilities"); out(day(17), B, "Mei Avivim Water", amt(110, 150), "Bills & utilities"); }
    if (r() < .45) inc(day(amt(14, 24)), "Acme Ltd", B, amt(3000, 6500), "Freelance & business income", { desc: "Client payment – Acme Ltd", tags: ["client", "taxable"] });
    if (r() < .5) out(day(amt(3, 26)), B, "ATM cash withdrawal", 300, "Cash withdrawals");

    // ---- Max card: everyday spending
    for (let i = 0; i < amt(6, 8); i++) out(day(amt(1, 28)), MAX, pick(["Shufersal Deal", "Rami Levy", "Victory", "Yochananof", "Shufersal Online"]), amt(60, 430), "Groceries");
    for (let i = 0; i < amt(5, 7); i++) out(day(amt(1, 28)), MAX, pick(["Wolt", "Aroma", "Cafe Cafe", "Moses Burger", "Hummus Abu Hassan", "10bis"]), amt(28, 190), "Eating out");
    for (let i = 0; i < amt(2, 3); i++) out(day(amt(1, 28)), MAX, pick(["Paz Gas Station", "Delek", "Sonol"]), amt(230, 340), "Car & fuel");
    out(day(amt(2, 25)), MAX, pick(["Rav-Kav top up", "Gett Taxi"]), amt(35, 110), "Transport");
    out(day(amt(2, 25)), MAX, "Super-Pharm", amt(40, 180), "Health & pharmacy");
    if (r() < .6) out(day(amt(2, 25)), MAX, pick(["Amazon", "KSP", "IKEA", "Home Center"]), amt(90, 780), "Shopping & home");
    if (r() < .4) out(day(amt(2, 25)), MAX, pick(["Zara", "Castro", "Renuar"]), amt(120, 420), "Clothing & shoes");

    // ---- Isracard: subscriptions, kids, leisure
    out(day(3), ISR, "Apple iCloud", 11.9, "Subscriptions", { tags: ["entertainment"] });
    out(day(6), ISR, "Netflix", 55, "Subscriptions", { tags: ["entertainment"] });
    out(day(12), ISR, "Spotify", 22, "Subscriptions", { tags: ["entertainment"] });
    out(day(18), ISR, "Partner", 89, "Phone & internet", { tags: ["phone"] });
    out(day(5), ISR, "Swimming lessons", 480, "Kids & education", { tags: ["kids"] });
    if (k <= 8) out(day(21), ISR, "Disney+", 35, "Subscriptions", { tags: ["entertainment"] });
    if (r() < .5) out(day(amt(8, 27)), ISR, pick(["Yes Planet Cinema", "Tel Aviv Museum", "Bowling Rishon"]), amt(90, 260), "Entertainment & leisure");
    if (r() < .5) out(day(amt(8, 27)), ISR, pick(["Wolt", "Dominos Pizza", "Pizza Hut"]), amt(60, 150), "Eating out");
    if (k === 5) { out(day(8), ISR, "Wizz Air", 1450, "Travel & vacations", { tags: ["trip"] }); out(day(9), ISR, "Booking.com", 2300, "Travel & vacations", { tags: ["trip"] }); }

    // ---- Wise (USD)
    const usd = amt(2100, 3000), rate = 3.45 + r() * .2;
    inc(day(27), "Northwind Inc", W, round(usd * rate), "Freelance & business income", { desc: "Freelance – Northwind Inc", tags: ["client"], orig: { cur: "USD", amt: usd }, rate });
    const aws = amt(38, 62);
    out(day(15), W, "Amazon Web Services", round(aws * rate), "Software & hosting", { orig: { cur: "USD", amt: aws }, rate, tags: ["business"] });
    out(day(27), W, "Wise conversion fee", round(5 * rate), "Fees & FX costs", { orig: { cur: "USD", amt: 5 }, rate });
  }
  // a couple of purchases still waiting to clear
  rows.sort((a, b) => (a.d < b.d ? 1 : -1));
  let seen = 0;
  for (const r of rows) if (r.from === MAX && seen < 2) { r.pending = true; seen++; }

  const next = (months) => iso(today.getUTCFullYear(), today.getUTCMonth() + months, 28);
  const jars = [
    { n: "Bills / expenses", p: 1, need: 6000, cap: null, bal: 6000, due: null },
    { n: "Summer trip", p: 2, need: 20000, cap: 800, bal: 6200, due: next(9) },
    { n: "New laptop", p: 3, need: 8000, cap: 1000, bal: 3000, due: next(4) },
    { n: "Emergency fund", p: 4, need: 50000, cap: 2000, bal: 14000, due: next(26) },
  ];
  const budgets = { Groceries: 2600, "Eating out": 1100, Transport: 600, Subscriptions: 300, "Car & fuel": 900, "Shopping & home": 800, "Entertainment & leisure": 500 };
  const balances = { "Bank Hapoalim": 23840, Wise: 1860, Max: -2980, Isracard: -1540, Pension: 428000 };
  const snaps = [];
  for (let k = 11; k >= 0; k--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - k, 1));
    const f = (11 - k) / 11;
    snaps.push({ month: d.toISOString().slice(0, 7), bank: round(11200 + f * 12600 + Math.sin(k) * 900), wise: round((600 + f * 1260) * 3.45), pension: round(381000 + f * 47000) });
  }
  return { rows, jars, budgets, balances, snaps };
}

export async function seedDemo() {
  const d = buildDemo();
  return tx(async (c) => {
    const n = (await c.query("SELECT count(*)::int AS n FROM transactions")).rows[0].n;
    if (n) throw new Error("database already has transactions; not seeding");
    for (const cat of new Set(d.rows.map((r) => r.c).concat(Object.keys(d.budgets)))) await c.query("INSERT INTO categories (name,color) VALUES ($1,0) ON CONFLICT (name) DO NOTHING", [cat]);
    for (const t of d.rows) {
      const ins = await c.query(
        `INSERT INTO transactions (date,description,from_name,to_name,amount,orig_currency,orig_amount,rate,category,note,pending,source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'',$10,'demo') RETURNING id`,
        [t.d, t.desc, t.from, t.to, t.a, t.orig?.cur || null, t.orig ? (t.a < 0 ? -t.orig.amt : t.orig.amt) : null, t.rate || null, t.c || null, !!t.pending]);
      for (const [i, g] of t.tags.entries()) {
        await c.query("INSERT INTO tags (name) VALUES ($1) ON CONFLICT DO NOTHING", [g]);
        await c.query("INSERT INTO transaction_tags (transaction_id,tag,position) VALUES ($1,$2,$3)", [ins.rows[0].id, g, i]);
      }
    }
    await c.query("DELETE FROM budgets");
    for (const [k, v] of Object.entries(d.budgets)) await c.query("INSERT INTO budgets (category,monthly_limit) VALUES ($1,$2)", [k, v]);
    await c.query("DELETE FROM jars");
    for (const j of d.jars) await c.query("INSERT INTO jars (name,priority,target,cap,balance,due) VALUES ($1,$2,$3,$4,$5,$6)", [j.n, j.p, j.need, j.cap, j.bal, j.due]);
    await c.query("INSERT INTO settings (key,value) VALUES ('jars_total',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [JSON.stringify(d.jars.reduce((s, j) => s + j.bal, 0))]);
    for (const [name, cur, kind, source, sub, nw, sort] of [["Bank Hapoalim", "ILS", "bank", "hapoalim", "Current account", true, 0], ["Max", "ILS", "card", "max", "Credit card", false, 1], ["Isracard", "ILS", "card", "isracard", "Credit card", false, 2], ["Wise", "USD", "wallet", "wise", "USD balance", true, 3]])
      await c.query("INSERT INTO accounts (name,currency,kind,source,subtitle,in_net_worth,sort) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (name,currency) DO NOTHING", [name, cur, kind, source, sub, nw, sort]);
    for (const [name, bal] of Object.entries(d.balances)) await c.query("UPDATE accounts SET balance=$2, balance_at=now() WHERE name=$1", [name, bal]);
    for (const s of d.snaps) await c.query("INSERT INTO net_worth_snapshots (month,bank,wise,pension) VALUES ($1,$2,$3,$4) ON CONFLICT (month) DO UPDATE SET bank=$2,wise=$3,pension=$4", [s.month, s.bank, s.wise, s.pension]);
    // exchange rates for the foreign rows (a month apart, so the demo works offline)
    for (const t of d.rows.filter((x) => x.rate)) await c.query("INSERT INTO exchange_rates (date,base,quote,rate,source) VALUES ($1,'USD','ILS',$2,'demo') ON CONFLICT (date,base,quote) DO NOTHING", [t.d, t.rate]);
    const last = d.rows.find((x) => x.rate);
    if (last) await c.query("INSERT INTO exchange_rates (date,base,quote,rate,source) VALUES (current_date,'USD','ILS',$1,'demo') ON CONFLICT (date,base,quote) DO NOTHING", [last.rate]);
    // the sample incomes have no receipts attached: do not nag about it in the demo
    await c.query("INSERT INTO settings (key,value) VALUES ('cfg',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [JSON.stringify({ docs: 0 })]);
    await audit(c, "Sample data loaded", `${d.rows.length} sample transactions`);
    await bumpRev(c);
    return { transactions: d.rows.length };
  });
}
