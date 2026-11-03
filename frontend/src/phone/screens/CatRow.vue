<script setup>
// One category or tag as the computer's row in its narrow form: the letter tile in the category's colour, the name and ⋯,
// then the numbers of the columns shown (This month, Last month, Usual month, Out, Change, Budget…), each with its title.
// Used by the Categories and tags list (a tap opens the category) and at the top of one category's screen.
// fx: the page's helpers from pagelogic/categories.js (so every number is the computer's).
defineProps({
  r: { type: Object, required: true }, L: { type: Object, required: true }, cols: { type: Array, required: true },
  fx: { type: Object, required: true }, tap: { type: Boolean, default: false }, i: { type: Number, default: 0 },
});
defineEmits(["open", "more", "budget", "rules"]);
</script>

<template>
  <div class="ph-crow" :class="{ zero: !r.n, tap }" :style="{ '--mc': L.color(r.k), '--i': i }" :role="tap ? 'button' : null" :tabindex="tap ? 0 : null" @click="tap && $emit('open')" @keydown.enter.self="tap && $emit('open')">
    <div class="ph-crow-h">
      <span class="ph-crow-mic" aria-hidden="true">{{ L.letter(r.k) }}</span>
      <b class="ph-crow-n"><bdi>{{ L.name(r.k) }}</bdi></b>
      <button v-if="L.edit(r.k)" type="button" class="ph-crow-more" :aria-label="fx.t('cats.menu.aria', { k: L.name(r.k) })" aria-haspopup="menu" @click.stop="$emit('more')">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </button>
    </div>
    <div class="ph-crow-nums">
      <div v-for="c in cols" :key="c" class="ph-crow-c" :class="'c-' + c">
        <span class="ph-crow-l">{{ fx.colHead(c) }}</span>
        <span v-if="c === 'change'" class="ph-cats-chg" :class="fx.change(r).cls">
          <svg v-if="fx.change(r).cls === 'good' || fx.change(r).cls === 'bad'" viewBox="0 0 24 24" aria-hidden="true" :class="{ dn: !fx.change(r).up }"><path d="M12 19V5M6 11l6-6 6 6" /></svg><span>{{ fx.change(r).text }}</span>
        </span>
        <template v-else-if="c === 'budget'">
          <template v-if="r.budget"><button type="button" class="ph-crow-link" @click.stop="$emit('budget')">{{ fx.t("cats.bud.amt", { amt: fx.fm(r.budget) }) }}</button><small class="ph-crow-bu">{{ fx.t("cats.bud.used", { amt: fx.fm(r.thisOut) }) }}</small></template>
          <button v-else-if="r.canBudget" type="button" class="ph-crow-link" @click.stop="$emit('budget')">{{ fx.t("cats.bud.set") }}</button>
          <b v-else class="ph-amt">–</b>
        </template>
        <template v-else-if="c === 'rules'"><button v-if="r.rules" type="button" class="ph-crow-link ph-amt" @click.stop="$emit('rules')">{{ r.rules }}</button><b v-else class="ph-amt">0</b></template>
        <b v-else-if="c === 'last'" class="ph-amt">{{ r.last ? fx.dcell(r.last) : "–" }}</b>
        <b v-else-if="c === 'n'" class="ph-amt">{{ r.n }}</b>
        <b v-else class="ph-amt" :class="fx.moneyCell(r, c).cls" dir="ltr">{{ fx.signed(fx.moneyCell(r, c).v) }}</b>
      </div>
    </div>
  </div>
</template>
