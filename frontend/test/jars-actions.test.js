// The jar changes write the same data, history lines and undo entries as the current app (web/js/08-jars.js act cases).
import test from "node:test";
import assert from "node:assert/strict";
import { oldApp } from "./old-app.js";
import { jarsModel, jarCtx, goalFix, moveJar, moveJarTo, reopenJar, releaseJars } from "../src/lib/jars.js";
import { fm } from "../src/format.js";

const NOW = new Date(2026, 9, 17, 12); // 17 Oct 2026
const base = () => ({
  cats: {}, cfg: { reserveAvg: false }, budgets: {}, jarsBuffer: 0, xf: [], txIgnore: {}, ccOverride: {}, audit: [], tx: [], bills: [],
  accounts: [{ n: "Bank", kind: "bank", v: 3000, cur: "ILS", inNW: true, at: "x" }],
  jars: [
    { id: 1, n: "Trip", p: 1, bal: 2000, need: 5000, cap: 100, due: "2027-04-17", got: 0 },
    { id: 2, n: "Rainy day", p: 2, bal: 1000, need: 0, cap: 300, got: 0 },
    { id: 3, n: "Laptop", p: 3, bal: 4000, need: 4000, cap: 0, auto: true, due: "2027-01-01" },
    { id: 4, n: "Sofa", p: 0, bal: 0, need: 2500, done: "2026-08-01" },
  ],
});
const old = oldApp(NOW);
// runs the old act() cases on S and gives back the jars and the new history lines
function oldDo(S, steps) {
  return JSON.parse(old.run(`S={...emptyState(),...structuredClone(__S)};S.cfg={...DEF_CFG,...S.cfg};renderAll=()=>{};toast=()=>{};save=()=>{};
    __steps.forEach(([a,d])=>{if(a!="jarRelease")return act(a,d,{dataset:{}});
      /* the body of act("jarRelease") after its confirm(); jarFree() needs a whole page */ let need=d.amt;[...jarsS()].reverse().forEach(j=>{if(need<=0||!(heldOf(j)>0))return;const t=Math.min(heldOf(j),Math.ceil(need));j.balNote="Released back to free money";jset(j.id,"bal",+(j.bal-t).toFixed(2));need-=t})});JSON.stringify({jars:S.jars,log:S.audit.map(e=>[e.action,e.detail,e.undo])})`, { __S: S, __steps: steps }));
}
function newDo(S, steps) {
  const log = [];
  for (const [a, d] of steps) {
    const ctx = jarCtx(jarsModel(S, NOW), fm);
    const r = a == "goalFix" ? goalFix(S, d.id, ctx) : a == "jarUp" || a == "jarDown" ? moveJar(S, d.id, a == "jarUp") : a == "jarReopen" ? reopenJar(S, d.id) : a == "jarpri" ? moveJarTo(S, d.id, d.pos) : releaseJars(S, d.amt, ctx);
    if (r) log.unshift(...[...r].reverse().map(([x, y, u]) => [x, y, u || null]));
  }
  return { jars: S.jars, log };
}
const strip = (J) => J.map(({ moves, ...j }) => ({ ...j, moves: (moves || []).map((m) => [m.amt, m.note]) }));

test("'Raise to ₪X a month' writes the old history lines with their undo", () => {
  const a = oldDo(base(), [["goalFix", { id: 1 }]]), b = newDo(base(), [["goalFix", { id: 1 }]]);
  assert.deepEqual(b.log, a.log);
  assert.deepEqual(b.log.map((l) => l[0]), ["Changed jar monthly amount"]);
  assert.deepEqual(b.log[0][2], { type: "jar", id: 1, f: "cap", old: 100 });
  assert.deepEqual(strip(b.jars), strip(a.jars));
});
test("a goal that works out its monthly amount gets both lines when raised", () => {
  const S = () => { const s = base(); s.jars[0].auto = true; return s; };
  const a = oldDo(S(), [["goalFix", { id: 1 }]]), b = newDo(S(), [["goalFix", { id: 1 }]]);
  assert.deepEqual(b.log, a.log);
  assert.deepEqual(b.log.map((l) => l[0]), ["Changed jar monthly amount", "Changed jar monthly amount mode"]);
});
test("priority: the arrows swap neighbours, the picker moves to a place", () => {
  const steps = [["jarDown", { id: 1 }], ["jarUp", { id: 3 }]];
  const a = oldDo(base(), steps), b = newDo(base(), steps);
  assert.deepEqual(b.log, a.log);
  assert.deepEqual(b.jars.map((j) => [j.id, j.p]), a.jars.map((j) => [j.id, j.p]));
  const S = base(); assert.deepEqual(moveJarTo(S, 3, 1), [["Reordered jars", "Laptop is now priority 1"]]); assert.deepEqual(S.jars.map((j) => j.p), [2, 3, 1, 0]);
});
test("reopen puts a completed jar last", () => {
  const a = oldDo(base(), [["jarReopen", { id: 4 }]]), b = newDo(base(), [["jarReopen", { id: 4 }]]);
  assert.deepEqual(b.log, a.log);
  assert.deepEqual(strip(b.jars), strip(a.jars));
});
test("taking money back from the jars writes saved-amount lines with undo, lowest priority first", () => {
  const a = oldDo(base(), [["jarRelease", { amt: 1500 }]]), b = newDo(base(), [["jarRelease", { amt: 1500 }]]);
  assert.deepEqual(b.log, a.log);
  assert.equal(b.log[0][2].f, "bal");
  assert.deepEqual(strip(b.jars).map(({ balNote, ...j }) => j), strip(a.jars).map(({ balNote, ...j }) => j));
});
