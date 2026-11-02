<script setup>
// Accounts (in More): one sentence with what is in your accounts (the same number as Home), then every account by kind
// (banks, cards, wallets, other) with its balance or what a card was charged this month and how it is read
// (its own description shows on its screen). An account opens its own screen (/accounts?id=<id>; /accounts?n=<name> is turned into that).
// Pull down to sync; + adds an account. Everything comes from pagelogic/accounts.js, the same as the computer's page.
import { computed, watch, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { home } from "../../core/derived.js";
import { openForm } from "../../core/forms.js";
import { openSettingsTab } from "../../views/settings/tab.js";
import { query, go } from "../../router.js";
import { brandIcon } from "../../brands.js";
import { pages } from "../../routes.js";
import { f0, fm } from "../../format.js";
import { hasRate } from "../../lib/accounts.js";
import { useAccounts } from "../../pagelogic/accounts.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import HeroSentence from "../components/HeroSentence.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const none = computed(() => null);
const { t, tk, S, fx, an, curSub, stLabel, sections, cardFor } = useAccounts(none);
const nav = usePhoneNav();
onMounted(() => data.start());
const P = (k, o, n) => t("phone.accounts." + k, o || {}, n);
const ACC_ICON = pages.find((p) => p.name === "accounts").icon;

// /accounts?n=<name> (from a balance update or the "account added" message): the account's own screen, by its id
watch([query, S], () => {
  const n = new URLSearchParams(query.value).get("n");
  if (!n || !S.value) return;
  const a = (S.value.accounts || []).find((x) => x.n == n && !x.hide);
  go(a ? "/accounts?id=" + a.id : "/accounts", { replace: true });
}, { immediate: true });

// the sentence: what is in your accounts, the same number and note as Home's "In your accounts"
const K = computed(() => home.value?.kpi || null);
const hero = computed(() => {
  const [a, b = ""] = P("hero", { amount: "\u0000" }).split("\u0000");
  return [{ text: a }, { amount: fm(K.value.cash) }, { text: b }];
});
const heroNote = computed(() => {
  const k = K.value, names = k.missing.map(an).join(", ");
  return [k.pen > 0 ? t("home.withPension", { amount: fm(k.withPension) }) : k.missing.length ? "" : t("home.worthSub"), k.missing.length ? t("home.notRead", { names }) : ""].filter(Boolean);
});

const TONE = { green: "pos", yellow: "warn", red: "neg", gray: "" };
const open = (c) => nav.push("account", String(c.a.id));
const goConn = () => openSettingsTab("conn");
// the amount at the end of a row: a card's charges this month, else the balance in shekels ("—" with no exchange rate yet)
const endAmt = (c) => (c.card ? "₪" + f0(c.mo ? c.mo.now : 0) : c.g.L.some((x) => hasRate(x, fx.value)) ? (c.tot < 0 ? "−" : "") + "₪" + f0(c.tot) : "—");
// under it: a card's last month, or the amounts of an account in another currency
const endNote = (c) => (c.card ? (c.mo && c.mo.last ? t("acc.lastMonthAmt", { amount: "₪" + f0(c.mo.last) }) : "") : c.g.L.some((x) => x.cur != "ILS") ? curSub(c.g.L) : "");
</script>

<template>
  <PhoneScreen refresh class="ph-accs">
    <template #actions>
      <IconButton :label="P('add')" icon-name="add" @tap="openForm('account')" />
    </template>

    <LoadError v-if="data.error.value && !S" :text="P('loadError')" />
    <SkeletonRows v-else-if="!S" :rows="5" />

    <EmptyState v-else-if="!sections.length" :icon="ACC_ICON" :title="t('acc.noneT')" :text="t('acc.noneX')" :action="t('acc.connect')" @action="goConn">
      <button type="button" class="ph-btn tonal" @click="openForm('account')">{{ t("acc.addPlain") }}</button>
    </EmptyState>

    <template v-else>
      <div v-if="K" class="ph-accs-top">
        <HeroSentence :parts="hero" />
        <p v-for="(l, i) in heroNote" :key="i" class="ph-meta ph-accs-note">{{ l }}</p>
      </div>

      <ListGroup v-for="s in sections" :key="s.k" :title="tk('acc.' + s.k)" :note="s.k == 'secCard' ? P('cardsNote') : ''">
        <ListRow v-for="c in s.L.map(cardFor)" :key="c.g.n" link class="ph-accs-row" @tap="open(c)">
          <template #lead><span class="ph-acc-logo" v-html="brandIcon(c.g.n, c.a.src, c.a.kind, c.a.ck)" /></template>
          <template #title>{{ an(c.lbl.name) }}<span v-if="c.lbl.tail" class="ph-accs-tail" dir="ltr">·· {{ c.lbl.tail }}</span></template>
          <template #sub><span class="ph-acc-st" :class="TONE[c.st.tone]">{{ stLabel(c.st) }}</span></template>
          <template #end>
            <span class="ph-accs-end">
              <span class="ph-amt" :class="{ neg: !c.card && c.tot < 0 }" dir="ltr">{{ endAmt(c) }}</span>
              <small v-if="endNote(c)">{{ endNote(c) }}</small>
            </span>
          </template>
        </ListRow>
      </ListGroup>
    </template>
  </PhoneScreen>
</template>
