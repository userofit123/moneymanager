// Today, for every page. Pages work out their numbers from `now` instead of calling new Date() themselves, so all of them agree,
// tests can fix the day (setNow), and a window left open past midnight moves on to the new day.
import { ref } from "vue";

export const now = ref(new Date());
let fixed = false;
export function setNow(d) { fixed = true; now.value = new Date(d); }

const p2 = (n) => String(n).padStart(2, "0");
// "2026-10-21" in the local time zone (toISOString() would give yesterday's date between midnight and 3am in Israel)
export const dayOf = (d) => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());

export function startClock() {
  if (typeof document === "undefined") return;
  const tick = () => { if (fixed) return; const d = new Date(); if (d.toDateString() !== now.value.toDateString()) now.value = d; };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  setInterval(tick, 60000);
}
