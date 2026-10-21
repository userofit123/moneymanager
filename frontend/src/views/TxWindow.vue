<script setup>
// The payment window: opens when you click a payment (Home's recent activity, an alert about one payment). It is a copy of the window on the Activity
// page (and of the current app's openTx sheet): what counted, name, category, tags, note, what the bank sent, history. It saves like Activity does.
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { hrefOf, onLink } from "../router.js";
import { pages } from "../routes.js";
import BaseButton from "../components/BaseButton.vue";
import BaseChip from "../components/BaseChip.vue";
import BaseDialog from "../components/BaseDialog.vue";
import MoneyAmount from "../components/MoneyAmount.vue";
import { kinds, duplicateIds, allTags, normTag, categoryNames, tagOffer, tagSimilar, applyTagRule, detailRows, flat, prettyKey, cardOf } from "./activity.js";
import { nameOf } from "./home.js";
import { categoryName } from "../catnames.js";

const { t, locale } = useI18n();
const today = new Date().toISOString().slice(0, 10);
const tk = (key, ...a) => t(key, ...a);
const S = computed(() => data.state.value);
const dupSet = computed(() => duplicateIds(S.value));
const tagText = ref("");
const k = computed(() => kinds(S.value, today));
const cats = computed(() => categoryNames(S.value));
const catLabel = (c) => (!c || c === "Uncategorized" ? t("activity.uncategorized") : categoryName(c, locale.value));
const dateFmt = (d, o) => new Date(d + "T12:00:00").toLocaleDateString(locale.value === "he" ? "he-IL" : "en-GB", o);
const day = (d) => dateFmt(d, { day: "numeric", month: "short" });
const plainAmount = (x) => x.balUpd || k.value.isXf(x);
// Saving: change a copy, send the whole state like the old page, then load the fresh copy. 409 means a sync changed the data first.
const saveError = ref("");
async function save(edit, action, detail) {
  const next = structuredClone(S.value);
  if (edit(next) === false) return;
  next.audit = [{ t: new Date().toISOString(), who: "You", action, detail, undo: null }, ...(next.audit || [])].slice(0, 2000);
  data.state.value = next;
  try {
    const r = await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    saveError.value = r.ok ? "" : r.status === 409 ? t("activity.stale") : t("activity.saveFailed");
  } catch { saveError.value = t("activity.saveFailed"); }
  await data.load();
}
const change = (id, edit, action, detail) => save((next) => { const tx = next.tx.find((x) => x.id === id); if (!tx) return false; edit(tx); }, action, detail);
const setCat = (x, c) => change(x.id, (tx) => { tx.c = c || "Uncategorized"; }, "Edited category", x.desc + ": " + (x.c || "—") + " → " + (c || "—"));
function addTags(x, val) {
  const add = String(val).split(",").map((v) => normTag(S.value, v)).filter((g) => g && !(x.tags || []).includes(g));
  tagText.value = "";
  if (!add.length) return;
  change(x.id, (tx) => { tx.tags = [...(tx.tags || []), ...add]; }, "Added tag", x.desc + ": " + add.join(", "));
  offer.value = tagOffer(S.value, { ...x, tags: [...(x.tags || []), ...add] }, add, k.value.ci);
}
const removeTag = (x, g) => change(x.id, (tx) => { tx.tags = (tx.tags || []).filter((y) => y !== g); }, "Removed tag", x.desc + ": " + g);
const tagSuggest = (x) => allTags(S.value).map(([g]) => g).filter((g) => !(x.tags || []).includes(g) && g.toLowerCase().includes(tagText.value.trim().replace(/^#+/, "").toLowerCase())).slice(0, 8);
function onTagKey(e, x) {
  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTags(x, tagText.value); }
  else if (e.key === "Backspace" && !tagText.value && x.tags?.length) removeTag(x, x.tags[x.tags.length - 1]);
  else if (e.key === "Escape") open.value = null;
}

// "Tag more like this?": after a tag is added, offer a rule that tags similar transactions now and in the future (like the current app).
const offer = ref(null); // { id, tags, kw, n }
const rule = ref(null); // the rule window: { id, tags, kw, all }
const ruleMatches = computed(() => (rule.value ? tagSimilar(S.value, rule.value.kw.trim().toLowerCase(), rule.value.id, rule.value.tags) : []));
const toast = ref("");
let toastTimer = null;
const say = (m) => { toast.value = m; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = ""; }, 4000); };
function openRule() { rule.value = { ...offer.value, all: true }; offer.value = null; }
async function saveRule() {
  const r = rule.value, kw = r.kw.trim().toLowerCase();
  if (kw.length < 2) return;
  let res;
  await save((next) => { res = applyTagRule(next, kw, r.tags, r.id, r.all); }, "Added tag rule", `"${kw}" → ${r.tags.join(",")}`);
  rule.value = null;
  say(res.n ? t("activity.ruleDone", { n: res.n }, res.n) : t("activity.ruleDoneNew"));
}

const xfOk = (r) => save((n) => { n.xf.find((x) => x.o === r.x.o).st = "ok"; }, "Transfer confirmed", r.o.from + " → " + r.i.to);
const xfNo = (o) => save((n) => { n.xf.find((x) => x.o === o).st = "rej"; }, "Not a transfer", "");
const dupDel = (x) => save((n) => { n.tx = n.tx.filter((y) => y.id !== x.id); }, "Deleted duplicate", x.desc + " on " + x.d);
const dupKeep = (x) => save((n) => { n.dupOk = { ...(n.dupOk || {}), [x.id]: 1 }; }, "Kept both transactions", x.desc);
const gapWhen = (x) => new Date(x).toLocaleString(locale.value === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const gapAmt = (r) => Math.abs(r.diff).toLocaleString(locale.value === "he" ? "he-IL" : "en-US", { maximumFractionDigits: 2 }) + " " + r.cur;
// Asking before a change, like the current app's "Yes, do it" box.
const ask = ref(null); // { title, text, danger, run }
const confirm = (title, text, run, danger) => { ask.value = { title, text, run, danger }; };
const askYes = () => { const a = ask.value; ask.value = null; a.run(); };

// The transaction window.
const txOpen = ref(null); // the id
const details = ref({}); // id → what the bank sent, or "load"
const cur = computed(() => (S.value?.tx || []).find((x) => x.id === txOpen.value) || null);
function openTx(x) {
  txOpen.value = x.id;
  if (!x.hasDet) { details.value = { ...details.value, [x.id]: details.value[x.id] || { details: null } }; return; }
  if (details.value[x.id]) return;
  details.value = { ...details.value, [x.id]: "load" };
  fetch("/api/transactions/" + x.id + "/details", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((j) => { details.value = { ...details.value, [x.id]: j || { details: null } }; });
}
const det = computed(() => (cur.value ? details.value[cur.value.id] : null));
const facts = computed(() => (cur.value ? detailRows(S.value, cur.value, det.value === "load" ? null : det.value) : []));
const rawFields = computed(() => (det.value && det.value !== "load" ? flat(det.value.details || {}).filter(([k]) => k !== "account") : []));
const factText = (v) => (v && typeof v === "object" ? (v.date ? dateFmt(v.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" }) : v.key ? tk("activity.d." + v.key) : v) : v);
const kindOf = (x) => (k.value.isXf(x) ? "transfer" : k.value.isCp(x) ? "cardpay" : x.a > 0 ? "income" : "expense");
const canMark = (x) => x.a < 0 && !x.virtual && !k.value.isXf(x) && !k.value.isCp(x);
const pairOf = (x) => (S.value?.xf || []).find((p) => p.st !== "rej" && (p.o === x.id || p.i === x.id));
const setName = (x, v) => save((n) => { n.cfg = n.cfg || {}; n.cfg.renames = { ...(n.cfg.renames || {}) }; if (v.trim()) n.cfg.renames[x.id] = v.trim(); else delete n.cfg.renames[x.id]; }, "Renamed", x.desc + " → " + (v.trim() || "—"));
const setNote = (x, v) => { if ((x.note || "") !== v) change(x.id, (tx) => { tx.note = v; }, "Edited note", x.desc + ": " + (v.slice(0, 40) || "—")); };
const cpMark = (x) => confirm(t("activity.d.cpMarkQ"), t("activity.d.cpMarkText"), () => save((n) => { n.ccOverride = { ...(n.ccOverride || {}), [x.id]: 2 }; }, "Marked as a card payment", x.desc));
const cpCount = (x) => confirm(t("activity.d.cpCountQ"), t("activity.d.cpCountText"), () => save((n) => { n.ccOverride = { ...(n.ccOverride || {}), [x.id]: 1 }; }, "Counted card payment as spending", x.desc));
const cpUncount = (x) => confirm(t("activity.d.cpUncountQ"), t("activity.d.cpUncountText"), () => save((n) => { n.ccOverride = { ...(n.ccOverride || {}) }; delete n.ccOverride[x.id]; }, "Treated as a card payment again", x.desc));
const ignOn = (x) => confirm(t("activity.d.ignOnQ"), t("activity.d.ignOnText"), () => save((n) => { n.txIgnore = { ...(n.txIgnore || {}), [x.id]: 1 }; }, "Left out of totals", x.desc));
const ignOff = (x) => confirm(t("activity.d.ignOffQ"), t("activity.d.ignOffText"), () => save((n) => { n.txIgnore = { ...(n.txIgnore || {}) }; delete n.txIgnore[x.id]; }, "Counted again", x.desc));
const xfNoAsk = (x) => confirm(t("activity.d.xfNoQ"), t("activity.d.xfNoText"), () => xfNo(pairOf(x).o));
const dupDelAsk = (x) => confirm(t("activity.d.dupDelQ"), t("activity.d.dupDelText"), () => { txOpen.value = null; dupDel(x); }, true);
const changes = computed(() => (cur.value ? (S.value?.audit || []).filter((a) => a.undo?.id === cur.value.id || (a.detail || "").startsWith(cur.value.desc)).slice(0, 6) : []));
function copyDetails() {
  const x = cur.value; if (!x) return;
  const lines = [nameOf(S.value, x), ...facts.value.map((r) => tk("activity.d." + r.k) + ": " + (r.v?.money != null ? x.a : factText(r.v)))];
  navigator.clipboard?.writeText(lines.join("\n")).then(() => say(t("activity.d.copied")), () => {});
}

defineExpose({ openTx });
const activityHref = hrefOf(pages.find((p) => p.name === "activity"));
</script>

<template>
  <div>
    <p v-if="toast" class="toast" role="status">{{ toast }}</p>

    <!-- "Tag more like this?" -->
    <BaseDialog :open="!!offer" :title="t('activity.offer.title')" @update:open="(v) => !v && (offer = null)">
      <template v-if="offer">{{ offer.n ? t("activity.offer.text", { n: offer.n, kw: offer.kw, tags: offer.tags.map((g) => "#" + g).join(" ") }, offer.n) : t("activity.offer.none", { kw: offer.kw, tags: offer.tags.map((g) => "#" + g).join(" ") }) }}</template>
      <template #actions><BaseButton variant="outline" size="small" @click="offer = null">{{ t("activity.offer.no") }}</BaseButton><BaseButton @click="openRule">{{ t("activity.offer.yes") }}</BaseButton></template>
    </BaseDialog>
    <BaseDialog :open="!!rule" :title="t('activity.offer.ruleTitle')" @update:open="(v) => !v && (rule = null)">
      <template v-if="rule">
        <p>{{ t("activity.offer.ruleText", { tags: rule.tags.map((g) => "#" + g).join(" ") }) }}</p>
        <label class="fld">{{ t("activity.offer.contains") }}<input v-model="rule.kw" class="tin" autocomplete="off" /></label>
        <label class="chk"><input v-model="rule.all" type="checkbox" :disabled="!ruleMatches.length" /><span>{{ ruleMatches.length ? t("activity.offer.alsoTag", { n: ruleMatches.length }, ruleMatches.length) : t("activity.offer.noMatches") }}</span></label>
        <p v-if="ruleMatches.length" class="muted small">{{ ruleMatches.slice(0, 3).map((x) => nameOf(S, x)).join(", ") }}{{ ruleMatches.length > 3 ? ", …" : "" }}</p>
      </template>
      <template #actions><BaseButton variant="outline" size="small" @click="rule = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :disabled="!rule || rule.kw.trim().length < 2" @click="saveRule">{{ t("activity.offer.create") }}</BaseButton></template>
    </BaseDialog>


    <!-- The transaction window -->
    <BaseDialog :open="!!cur" :title="cur ? nameOf(S, cur) : ''" class="txw" @update:open="(v) => !v && (txOpen = null)">
      <template v-if="cur">
        <div class="txh">
          <span class="muted small"><span class="num">{{ day(cur.d) }}</span> · {{ cur.from }} → {{ cur.to }}</span>
          <MoneyAmount :value="cur.a" sign size="big" :tone="plainAmount(cur) ? 'plain' : 'auto'" />
        </div>
        <div class="chips">
          <BaseChip :kind="kindOf(cur) === 'income' ? 'good' : 'info'">{{ tk("activity.d.kind." + kindOf(cur)) }}</BaseChip>
          <BaseChip v-if="!k.isXf(cur) && cur.c" kind="tint">{{ catLabel(cur.c) }}</BaseChip>
          <BaseChip v-for="g in cur.tags || []" :key="g">#{{ g }}</BaseChip>
        </div>

        <h3>{{ t("activity.d.counted") }}</h3>
        <div class="rels">
          <div v-if="k.isCp(cur)" class="rel"><b>{{ t("activity.type.cardpay") }}</b><span class="small">{{ cardOf(cur, k.ci) ? t("activity.d.cpText", { card: cardOf(cur, k.ci) }) : t("activity.d.cpTextAny") }}</span><BaseButton variant="outline" @click="cpCount(cur)">{{ t("activity.d.cpCount") }}</BaseButton></div>
          <div v-else-if="S.ccOverride?.[cur.id] == 1" class="rel"><b>{{ t("activity.d.counted1") }}</b><span class="small">{{ t("activity.d.counted1Text") }}</span><BaseButton variant="outline" @click="cpUncount(cur)">{{ t("activity.d.cpUncount") }}</BaseButton></div>
          <div v-if="pairOf(cur)" class="rel"><b>{{ t("activity.type.transfer") }}</b><span class="small">{{ t("activity.d.xfText") }}</span><BaseButton variant="outline" @click="xfNoAsk(cur)">{{ t("activity.r.notXf") }}</BaseButton></div>
          <div v-if="k.isIgn(cur)" class="rel"><b>{{ t("activity.d.ignTitle") }}</b><span class="small">{{ t("activity.d.ignText") }}</span><BaseButton variant="outline" @click="ignOff(cur)">{{ t("activity.d.ignOff") }}</BaseButton></div>
          <div v-if="k.isFut(cur)" class="rel"><b>{{ t("activity.upcoming") }}</b><span class="small">{{ t("activity.d.futText") }}</span></div>
          <div v-if="dupSet.has(cur.id)" class="rel amber"><b>{{ t("activity.d.dupTitle") }}</b><span class="small">{{ t("activity.d.dupText") }}</span><div class="row"><BaseButton variant="danger" @click="dupDelAsk(cur)">{{ t("activity.r.dupDel") }}</BaseButton><BaseButton variant="outline" @click="dupKeep(cur)">{{ t("activity.r.dupKeep") }}</BaseButton></div></div>
          <p v-if="!k.isCp(cur) && S.ccOverride?.[cur.id] != 1 && !pairOf(cur) && !k.isIgn(cur) && !k.isFut(cur) && !dupSet.has(cur.id)" class="muted small">{{ cur.a > 0 ? t("activity.d.normalIn") : t("activity.d.normalOut") }}</p>
        </div>

        <template v-if="!cur.virtual && !k.isXf(cur)">
          <h3>{{ t("activity.d.organise") }}</h3>
          <label class="fld">{{ t("activity.d.displayName") }}<input class="tin" :value="S.cfg?.renames?.[cur.id] || ''" :placeholder="nameOf(S, cur)" maxlength="80" @change="setName(cur, $event.target.value)" /></label>
          <label class="fld">{{ t("activity.category") }}<select class="tin" :value="cur.c && cur.c !== 'Uncategorized' ? cur.c : ''" @change="setCat(cur, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ c }}</option></select></label>
          <div class="fld">{{ t("activity.tag") }}
            <div class="chips"><BaseChip v-for="g in cur.tags || []" :key="g" kind="tint">#{{ g }}<button type="button" class="rm" :aria-label="t('activity.removeTag')" @click="removeTag(cur, g)">×</button></BaseChip></div>
            <input v-model="tagText" class="tin" :placeholder="t('activity.addTag')" :aria-label="t('activity.addTag')" autocomplete="off" @keydown="onTagKey($event, cur)" />
            <div v-if="tagText.trim()" class="sug"><BaseChip v-for="s in tagSuggest(cur)" :key="s" clickable @click="addTags(cur, s)">{{ s }}</BaseChip><BaseChip v-if="!tagSuggest(cur).some((s) => s.toLowerCase() === tagText.trim().toLowerCase())" clickable kind="tint" @click="addTags(cur, tagText)">{{ t("activity.createTag", { tag: tagText.trim() }) }}</BaseChip></div>
          </div>
        </template>
        <label v-if="!cur.virtual" class="fld">{{ t("activity.d.note") }}<textarea class="tin" rows="2" :value="cur.note || ''" :placeholder="t('activity.d.notePh')" @change="setNote(cur, $event.target.value)" /></label>

        <template v-if="canMark(cur) || (!cur.virtual && !k.isXf(cur) && !k.isCp(cur) && !k.isIgn(cur))">
          <h3>{{ t("activity.d.actions") }}</h3>
          <div class="row">
            <BaseButton v-if="canMark(cur)" variant="outline" @click="cpMark(cur)">{{ t("activity.d.cpMark") }}</BaseButton>
            <BaseButton v-if="!cur.virtual && !k.isXf(cur) && !k.isCp(cur) && !k.isIgn(cur)" variant="outline" @click="ignOn(cur)">{{ t("activity.d.ignOn") }}</BaseButton>
          </div>
        </template>

        <h3>{{ t("activity.d.details") }}</h3>
        <dl class="kv">
          <template v-for="r in facts" :key="r.k"><dt>{{ tk("activity.d." + r.k) }}</dt><dd :class="{ mono: r.mono }"><MoneyAmount v-if="r.v && r.v.money != null" :value="r.v.money" sign /><template v-else>{{ factText(r.v) }}</template></dd></template>
        </dl>
        <p v-if="det === 'load'" class="muted small">{{ t("activity.d.loading") }}</p>
        <p v-else-if="cur.src === 'manual'" class="muted small">{{ t("activity.d.manual") }}</p>
        <p v-else-if="!det?.details" class="muted small">{{ t("activity.d.old") }}</p>
        <details v-if="rawFields.length" class="raw"><summary>{{ t(cur.src === "wise" ? "activity.d.allWise" : "activity.d.allBank") }} ({{ rawFields.length }})</summary>
          <dl class="kv"><template v-for="[a, b] in rawFields" :key="a"><dt>{{ prettyKey(a) }}</dt><dd>{{ b }}</dd></template></dl>
        </details>

        <template v-if="changes.length">
          <h3>{{ t("activity.d.history") }}</h3>
          <div v-for="a in changes" :key="a.t + a.action" class="small"><b>{{ a.action }}</b> <span class="muted">{{ gapWhen(a.t) }}</span><div class="muted">{{ a.detail }}</div></div>
        </template>
      </template>
      <template #actions><BaseButton variant="outline" @click="copyDetails">{{ t("activity.d.copy") }}</BaseButton><a class="btnlink" :href="activityHref" @click="onLink">{{ t("activity.d.more") }}</a><BaseButton @click="txOpen = null">{{ t("activity.d.done") }}</BaseButton></template>
    </BaseDialog>

    <BaseDialog :open="!!ask" :title="ask ? ask.title : ''" @update:open="(v) => !v && (ask = null)">
      <template v-if="ask">{{ ask.text }}</template>
      <template #actions><BaseButton variant="outline" @click="ask = null">{{ t("activity.d.cancel") }}</BaseButton><BaseButton :variant="ask && ask.danger ? 'danger' : 'filled'" @click="askYes">{{ t("activity.d.yes") }}</BaseButton></template>
    </BaseDialog>
  </div>
</template>

<style scoped>
.muted { color: var(--tx2); }
.small { font-size: var(--fs-sm); }
h3 { font-size: 14px; font-weight: 600; margin: var(--sp4) 0 var(--sp2); color: var(--tx); }
.row { display: flex; flex-wrap: wrap; gap: var(--sp2); align-items: center; }
.btnlink { display: inline-flex; align-items: center; min-height: 40px; padding: 0 var(--sp4); border-radius: var(--pill); border: 1px solid var(--ol); color: var(--acc); text-decoration: none; font-weight: 600; }
.toast { position: fixed; inset-inline: 0; bottom: calc(90px + var(--sb)); margin: 0 auto; width: fit-content; max-width: 90vw; padding: 10px 18px; border-radius: var(--pill); background: var(--tx); color: var(--bg); z-index: 30; }
.fld { display: grid; gap: 4px; margin-bottom: var(--sp3); color: var(--tx); font-size: 13px; }
.chk { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; color: var(--tx); }
.txh { display: flex; justify-content: space-between; align-items: center; gap: var(--sp3); flex-wrap: wrap; }
.rels { display: grid; gap: var(--sp2); }
.rel { display: grid; gap: 4px; justify-items: start; padding: var(--sp3); border-radius: var(--r-md); background: var(--s1); color: var(--tx); }
.rel.amber { background: color-mix(in srgb, var(--warn) 14%, var(--bg)); }
.kv { display: grid; grid-template-columns: minmax(7rem, auto) 1fr; gap: 6px var(--sp3); margin: 0; font-size: 13px; }
.kv dt { color: var(--tx2); }
.kv dd { margin: 0; color: var(--tx); overflow-wrap: anywhere; }
.mono { font-family: ui-monospace, monospace; direction: ltr; unicode-bidi: isolate; text-align: start; }
.raw { margin-top: var(--sp3); }
.raw summary { cursor: pointer; color: var(--acc); font-size: 13px; margin-bottom: var(--sp2); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.rm { border: 0; background: none; color: inherit; cursor: pointer; padding: 0 0 0 2px; font-size: 14px; line-height: 1; }
.tin { font-size: var(--fs); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--ol); background: var(--s1); color: var(--tx); }
.sug { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
</style>
