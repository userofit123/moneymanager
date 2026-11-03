<script setup>
// Accounts (in More): the computer's Accounts page for a phone. Its short explanation, then every account by kind (banks,
// cards, wallets, other), each as the computer's account card: logo and name, its type, the balance large (a card: what
// it was charged this month), the line under it, how it is read (a coloured badge) and how many transactions it has.
// A card opens the account's own screen (/accounts?id=<id>; /accounts?n=<name> is turned into that).
// Pull down to sync; + adds an account. Everything comes from pagelogic/accounts.js, the same as the computer's page.
import { computed, watch, onMounted } from "vue";
import { data } from "../../stores/data.js";
import { openForm } from "../../core/forms.js";
import { openSettingsTab } from "../../views/settings/tab.js";
import { query, go } from "../../router.js";
import { brandIcon } from "../../brands.js";
import { pages } from "../../routes.js";
import { f0 } from "../../format.js";
import { TONEC, hasRate } from "../../lib/accounts.js";
import { useAccounts } from "../../pagelogic/accounts.js";
import { usePhoneNav } from "../navigation.js";
import PhoneScreen from "../components/PhoneScreen.vue";
import IconButton from "../components/IconButton.vue";
import ListGroup from "../components/ListGroup.vue";
import AmountCard from "../components/AmountCard.vue";
import EmptyState from "../components/EmptyState.vue";
import SkeletonRows from "../components/SkeletonRows.vue";
import LoadError from "../components/LoadError.vue";
defineProps({ id: { type: String, default: null } });

const none = computed(() => null);
const { t, tk, S, fx, an, curSub, typeOf, stLabel, sections, cardFor } = useAccounts(none);
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

const open = (c) => nav.push("account", String(c.a.id));
const goConn = () => openSettingsTab("conn");
// the amount, as on the computer's card: a card's charges this month, else the balance in shekels ("—" with no exchange rate yet)
const val = (c) => (c.card ? f0(c.mo ? c.mo.now : 0) : c.g.L.some((x) => hasRate(x, fx.value)) ? (c.tot < 0 ? "−" : "") + f0(c.tot) : "—");
// the line under it: a card's "charged this month · last month", the amounts of an account in another currency, or its description
const sub = (c) => (c.card ? t("acc.chargedMonth") + (c.mo && c.mo.last ? " · " + t("acc.lastMonthAmt", { amount: "₪" + f0(c.mo.last) }) : "") : c.g.L.some((x) => x.cur != "ILS") ? curSub(c.g.L) : an(c.a.s || ""));
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
      <p class="ph-accs-intro">{{ t("acc.intro") }}</p>

      <ListGroup v-for="s in sections" :key="s.k" :title="tk('acc.' + s.k)" bare>
        <div class="ph-accs-list">
          <AmountCard v-for="c in s.L.map(cardFor)" :key="c.g.n" class="ph-accs-card" :icon="brandIcon(c.g.n, c.a.src, c.a.kind, c.a.ck)" :chip="typeOf(c.a)" :value="val(c)" :sub="sub(c)" @tap="open(c)">
            <template #label>{{ an(c.lbl.name) }}<span v-if="c.lbl.tail" class="ph-accs-tail" dir="ltr">·· {{ c.lbl.tail }}</span></template>
            <template #foot>
              <span class="ph-accs-foot"><span class="bd" :class="TONEC[c.st.tone]">{{ stLabel(c.st) }}</span><span>{{ c.foot }}</span></span>
            </template>
          </AmountCard>
        </div>
      </ListGroup>
    </template>
  </PhoneScreen>
</template>
