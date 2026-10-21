<script setup>
// Shows the add/edit window that was asked for with openForm() (core/forms.js). Each kind is its own component, loaded when first needed.
import { defineAsyncComponent, computed } from "vue";
import { form, closeForm } from "../core/forms.js";

const KINDS = {
  tx: () => import("./forms/TxAddForm.vue"),
  bill: () => import("./forms/BillForm.vue"),
  budget: () => import("./forms/BudgetForm.vue"),
  jar: () => import("./forms/JarFormHost.vue"),
  rule: () => import("./forms/RuleForm.vue"),
  category: () => import("./forms/CategoryForm.vue"),
  pension: () => import("./forms/PensionForm.vue"),
};
const comps = Object.fromEntries(Object.entries(KINDS).map(([k, l]) => [k, defineAsyncComponent(l)]));
const comp = computed(() => (form.value ? comps[form.value.kind] : null));
</script>

<template>
  <component :is="comp" v-if="comp" :key="form.at" v-bind="form.props" @close="closeForm" />
</template>
