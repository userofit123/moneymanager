// Every screen of the phone app. Pages (by their name in routes.js) and the screens pushed on top of them.
// tab: the tab whose stack the page opens in (pages that are not tabs open in the More tab).
// param: for a pushed screen, the ?part of the address that holds what it shows (/accounts?id=4 is the account 4 screen),
// and on: the page it is pushed on (none: it can be pushed on any screen, like a transaction).
// title: the text key of its name. load: the screen's file (each in a file of its own, loaded when first shown).
export const TABS = ["recap", "home", "activity", "jars", "bills", "forecast", "more"];

export const SCREENS = {
  home: { tab: "home", title: "nav.home", load: () => import("./screens/HomeScreen.vue") },
  activity: { tab: "activity", title: "nav.activity", load: () => import("./screens/ActivityScreen.vue") },
  jars: { tab: "jars", title: "nav.jars", load: () => import("./screens/JarsScreen.vue") },
  bills: { tab: "bills", title: "nav.bills", load: () => import("./screens/BillsScreen.vue") },
  more: { tab: "more", title: "shell.more", load: () => import("./screens/MoreScreen.vue") },
  recap: { tab: "recap", title: "nav.recap", load: () => import("./screens/RecapScreen.vue") },
  accounts: { tab: "more", title: "nav.accounts", load: () => import("./screens/AccountsScreen.vue") },
  budgets: { tab: "more", title: "nav.budgets", load: () => import("./screens/BudgetsScreen.vue") },
  reports: { tab: "more", title: "nav.reports", load: () => import("./screens/ReportsScreen.vue") },
  forecast: { tab: "forecast", title: "nav.forecast", load: () => import("./screens/ForecastScreen.vue") },
  alerts: { tab: "more", title: "nav.alerts", load: () => import("./screens/AlertsScreen.vue") },
  categories: { tab: "more", title: "nav.categories", load: () => import("./screens/CategoriesScreen.vue") },
  settings: { tab: "more", title: "nav.settings", load: () => import("./screens/SettingsScreen.vue") },
  account: { on: "accounts", param: "id", title: "phone.shell.account", load: () => import("./screens/AccountScreen.vue") },
  jar: { on: "jars", param: "jar", title: "phone.shell.jar", load: () => import("./screens/JarScreen.vue") },
  bill: { on: "bills", param: "bill", title: "phone.shell.bill", load: () => import("./screens/BillScreen.vue") },
  category: { on: "categories", param: "cat", title: "phone.shell.category", load: () => import("./screens/CategoryScreen.vue") },
  settingsSection: { on: "settings", param: "sec", title: "nav.settings", load: () => import("./screens/SettingsSectionScreen.vue") },
  transaction: { param: "tx", title: "phone.shell.transaction", load: () => import("./screens/TransactionScreen.vue") },
};
// pushed screens in the order their ?part is read (a transaction can sit on top of an account)
export const PUSHED = Object.keys(SCREENS).filter((n) => SCREENS[n].param);

// each screen's file is loaded once and kept
import { defineAsyncComponent } from "vue";
const loaded = new Map();
export function screenOf(name) {
  if (!loaded.has(name)) loaded.set(name, defineAsyncComponent(SCREENS[name].load));
  return loaded.get(name);
}
