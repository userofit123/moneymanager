// Builds the documentation site (GitHub Pages) from the Markdown guides in docs/.
// Run: npm ci --prefix scripts/site && node scripts/build-site.mjs [--docs <dir>] [--out <dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const { marked } = createRequire(path.join(here, "site/package.json"))("marked");

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? path.resolve(process.argv[i + 1]) : def;
};
const docsDir = arg("docs", path.join(root, "docs"));
const outDir = arg("out", path.join(root, "_site"));
const siteDir = path.join(here, "site");

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const stripTags = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Site settings and navigation
const cfgFile = path.join(docsDir, "site.json");
const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : { nav: [] };
const siteTitle = cfg.title || "Money Manager";
const tagline = cfg.tagline || "";
const repo = (cfg.repo || "https://github.com/userofit123/moneymanager").replace(/\/$/, "");
const nav = cfg.nav || [];
const flat = nav.flatMap((n) => (n.group ? n.items : [n]));
const pages = new Set(flat.map((n) => n.file));

const outName = (file) => file.replace(/\.md$/i, ".html");

// Front matter: --- key: value --- at the top of the file
function frontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return [{}, text];
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = line.match(/^([\w-]+):\s*(.*)$/);
    if (k) meta[k[1]] = k[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return [meta, text.slice(m[0].length)];
}

// Turn a link or image address found in a page into the right address for the site
function fixUrl(url, fromFile) {
  if (!url || /^([a-z][a-z0-9+.-]*:|#|\/\/|\/)/i.test(url)) return url;
  const cut = url.search(/[#?]/);
  const p = cut < 0 ? url : url.slice(0, cut);
  const hash = cut < 0 ? "" : url.slice(cut);
  const abs = path.resolve(path.dirname(path.join(docsDir, fromFile)), decodeURI(p));
  const rel = path.relative(docsDir, abs).split(path.sep).join("/");
  const inDocs = !rel.startsWith("..");
  const toHere = (target) => {
    const r = path.posix.relative(path.posix.dirname(fromFile), target);
    return (r || path.posix.basename(target)) + hash;
  };
  if (inDocs && /\.md$/i.test(rel) && pages.has(rel)) return toHere(outName(rel));
  if (inDocs && /^(screenshots|images)\//.test(rel)) return toHere(rel);
  const repoRel = path.relative(root, abs).split(path.sep).join("/");
  if (repoRel.startsWith("..")) return url;
  return `${repo}/blob/main/${repoRel}${hash}`;
}

function fixUrls(html, fromFile) {
  html = html.replace(/\b(href|src)="([^"]*)"/g, (_, a, u) => `${a}="${fixUrl(u.replace(/&amp;/g, "&"), fromFile).replace(/&/g, "&amp;")}"`);
  return html.replace(/\bsrcset="([^"]*)"/g, (_, v) =>
    `srcset="${v.split(",").map((s) => { const [u, ...r] = s.trim().split(/\s+/); return [fixUrl(u, fromFile), ...r].join(" "); }).join(", ")}"`);
}

// Heading ids and anchor links; collects the "On this page" list
function addHeadings(html) {
  const toc = [];
  const used = new Set();
  html = html.replace(/<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/g, (all, lvl, attrs, inner) => {
    const text = stripTags(inner).trim();
    let id = (attrs.match(/\bid="([^"]*)"/) || [])[1];
    if (!id) {
      id = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "section";
      let n = 2, base = id;
      while (used.has(id)) id = `${base}-${n++}`;
    }
    used.add(id);
    if (lvl === "2" || lvl === "3") toc.push({ lvl: +lvl, id, text });
    return `<h${lvl} id="${id}">${inner.trim()} <a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${lvl}>`;
  });
  return [html, toc];
}

// > **Note** ... becomes a callout box
function addCallouts(html) {
  return html.replace(/<blockquote>\s*<p><strong>(Note|Tip|Warning)[:.]?<\/strong>:?\s*([\s\S]*?)<\/blockquote>/g, (_, kind, rest) => {
    const k = kind.toLowerCase();
    return `<div class="callout callout-${k}" role="note"><p class="callout-title">${kind}</p><p>${rest.replace(/^\s+/, "")}</div>`;
  });
}

function navHtml(current) {
  const link = (n) => `<li><a href="${esc(outName(n.file))}"${n.file === current ? ' aria-current="page"' : ""}>${esc(n.title)}</a></li>`;
  return nav.map((n) => n.group
    ? `<li class="nav-group"><span class="nav-group-title">${esc(n.group)}</span><ul>${n.items.map(link).join("")}</ul></li>`
    : link(n)).join("\n");
}

// Pages in nested folders need a path back to the site root
const rootPrefix = (file) => { const d = path.posix.dirname(file); return d === "." ? "" : d.split("/").map(() => "..").join("/") + "/"; };

const template = fs.readFileSync(path.join(siteDir, "template.html"), "utf8");
const icon = fs.readFileSync(path.join(root, "frontend/public/icon-source.svg"), "utf8").replace(/id="g"/g, 'id="logo-g"').replace(/url\(#g\)/g, "url(#logo-g)");

function render(file, extra = {}) {
  const raw = extra.markdown ?? fs.readFileSync(path.join(docsDir, file), "utf8");
  const [meta, body] = frontMatter(raw);
  let html = marked.parse(body, { gfm: true });
  html = fixUrls(html, file);
  let toc;
  [html, toc] = addHeadings(html);
  html = addCallouts(html);
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  const title = meta.title || (h1 && stripTags(h1.replace(/<a class="anchor".*$/, "")).trim()) || siteTitle;
  const desc = meta.description || tagline;
  const idx = flat.findIndex((n) => n.file === file);
  const pn = (n, cls, label) => n ? `<a class="pn ${cls}" href="${esc(outName(n.file))}"><span class="pn-label">${label}</span><span class="pn-title">${esc(n.title)}</span></a>` : "<span></span>";
  const pager = idx < 0 ? "" : `<nav class="pager" aria-label="Previous and next page">${pn(flat[idx - 1], "prev", "Previous")}${pn(flat[idx + 1], "next", "Next")}</nav>`;
  const fullTitle = file === "index.md" || title === siteTitle ? siteTitle : `${title} · ${siteTitle}`;
  const rp = rootPrefix(file);
  const vars = {
    TITLE: esc(fullTitle), DESC: esc(desc), OGTITLE: esc(title), SITE: esc(siteTitle), TAGLINE: esc(tagline),
    REPO: esc(repo), ROOT: rp, ICON: icon, NAV: navHtml(file), CONTENT: html, PAGER: pager,
    TOC: toc.map((t) => `<li class="toc-${t.lvl}"><a href="#${t.id}">${esc(t.text)}</a></li>`).join(""),
    EDIT: file.startsWith("404") ? "" : `<a href="${esc(repo)}/blob/main/docs/${esc(file)}">Edit this page on GitHub</a>`,
    HOME: rp + "index.html",
    YEAR: String(new Date().getFullYear()),
  };
  const page = template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  const target = path.join(outDir, outName(file));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, page);
}

// Build
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });
for (const f of ["site.css", "site.js"]) fs.copyFileSync(path.join(siteDir, f), path.join(outDir, "assets", f));
fs.writeFileSync(path.join(outDir, "assets/icon.svg"), icon.replace(/id="logo-g"/g, 'id="g"').replace(/#logo-g/g, "#g"));
fs.writeFileSync(path.join(outDir, ".nojekyll"), "");
for (const d of ["screenshots", "images"]) {
  const src = path.join(docsDir, d);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(outDir, d), { recursive: true });
}
for (const n of flat) {
  if (!fs.existsSync(path.join(docsDir, n.file))) { console.warn(`Missing page listed in site.json: ${n.file}`); continue; }
  render(n.file);
}
render("404.html.md", { markdown: "---\ntitle: Page not found\n---\n# Page not found\n\nThat page does not exist (any more). Try the menu, or go to the [start page](index.md).\n" });
// the 404 page is served from any depth, so it uses addresses from the site root
fs.renameSync(path.join(outDir, "404.html.html"), path.join(outDir, "404.html"));
console.log(`Built ${flat.length} pages into ${path.relative(process.cwd(), outDir) || outDir}`);
