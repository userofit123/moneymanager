// For the lists: a row shows up to `max` labelled pills (they wrap under the name when they do not fit beside it) and the rest become one "+N" pill whose tooltip names them, so the name
// always keeps its room. The pills about the payment itself always show (instalment like 3/4, expected bill, upcoming, pending);
// the others fill what is left of the `max` places. Icon-only pills (the note) always stay. The transaction window shows them all.
const FIRST = new Set(["p-inst", "p-exp", "p-up", "p-pend"]);
export function fitChips(list, max = 3) {
  const labelled = list.filter((c) => c.label);
  if (labelled.length <= max) return list;
  let room = Math.max(0, max - labelled.filter((c) => FIRST.has(c.cls)).length);
  const show = new Set(list.filter((c) => c.label && (FIRST.has(c.cls) || room-- > 0)));
  const rest = labelled.filter((c) => !show.has(c)).map((c) => c.label);
  if (!rest.length) return list;
  const out = []; let at = -1;
  list.forEach((c) => { if (!c.label || show.has(c)) { out.push(c); if (c.label) at = out.length; } });
  out.splice(at < 0 ? out.length : at, 0, { cls: "p-more", label: "+" + rest.length, tip: rest.join(" · ") });
  return out;
}
