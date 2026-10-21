// A template step for every .vue file: in a run of text written in a template, each " · " becomes <span class="dt">·</span>,
// the lighter dot with room around it that the current app draws between parts of a line. Like its pass() in
// web/js/09-profile-export-settings.js, the whole run of text is wrapped in a <span> first (so it also works inside flex boxes).
// Dots inside text that comes from code are handled on the page by core/polish.js.
const ELEMENT = 1, TEXT = 2, INTERPOLATION = 5, IF_BRANCH = 10, FOR = 11, ROOT = 0;
const textNode = (content, loc) => ({ type: TEXT, content, loc });
const el = (tag, cls, children, loc) => ({ type: ELEMENT, ns: 0, tag, tagType: 0, props: cls ? [{ type: 6, name: "class", nameLoc: loc, value: textNode(cls, loc), loc }] : [], children, isSelfClosing: false, codegenNode: undefined, loc });
const SKIP = new Set(["svg", "textarea", "option", "title", "select", "script", "style"]);
export function dotSpans(node) {
  if (![ROOT, ELEMENT, IF_BRANCH, FOR].includes(node.type) || SKIP.has(node.tag) || !node.children) return;
  if (!node.children.some((c) => c.type === TEXT && c.content.includes(" · "))) return;
  const out = []; let run = [];
  const flush = () => {
    if (run.some((c) => c.type === TEXT && c.content.includes(" · "))) {
      const parts = [];
      for (const c of run) {
        if (c.type !== TEXT || !c.content.includes(" · ")) { parts.push(c); continue; }
        c.content.split(" · ").forEach((p, i) => { if (i) parts.push(el("span", "dt", [textNode("·", c.loc)], c.loc)); if (p) parts.push(textNode(p, c.loc)); });
      }
      out.push(el("span", "", parts, run[0].loc));
    } else out.push(...run);
    run = [];
  };
  for (const c of node.children) { if (c.type === TEXT || c.type === INTERPOLATION) run.push(c); else { flush(); out.push(c); } }
  flush();
  node.children = out;
}
