// The new app's pages by address, the same addresses as the old app (for example /app/activity is the old /activity).
// "nav" pages show in the side and bottom menus;
// "main" ones also show in the phone's bottom bar (the rest are under More), like the current app. "icon" is the inside of the
// current app's 24x24 menu icon, copied as is.
export const BASE = "/app";
export const pages = [
  { name: "recap", path: "/recap", nav: true, component: () => import("./views/Recap.vue"), icon: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v3M5.6 8.6l1.8 1.8M18.4 8.6l-1.8 1.8"/>' },
  { name: "home", path: "/home", nav: true, main: true, icon: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', component: () => import("./views/Home.vue") },
  { name: "accounts", path: "/accounts", nav: true, component: () => import("./views/Accounts.vue"), icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>' },
  { name: "activity", path: "/activity", nav: true, main: true, icon: '<path d="M4 6h16M4 12h16M4 18h10"/>', component: () => import("./views/Activity.vue") },
  { name: "jars", path: "/jars", nav: true, main: true, icon: '<path d="M7 3h10v3H7zM6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>', component: () => import("./views/Jars.vue") },
  { name: "bills", path: "/bills", nav: true, main: true, icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>', component: () => import("./views/Bills.vue") },
  { name: "budgets", path: "/budgets", nav: true, icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 4"/>', component: () => import("./views/Budgets.vue") },
  { name: "reports", path: "/reports", nav: true, icon: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', component: () => import("./views/Reports.vue") },
  { name: "forecast", path: "/forecast", nav: true, icon: '<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>', component: () => import("./views/Forecast.vue") },
  { name: "alerts", path: "/alerts", nav: true, icon: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0"/>', component: () => import("./views/Alerts.vue") },
  { name: "categories", path: "/categories", nav: true, icon: '<path d="M3 12V4h8l10 10-8 8z"/><path d="M7.5 8h.01"/>', component: () => import("./views/Categories.vue") },
  { name: "settings", path: "/settings", nav: true, component: () => import("./views/Settings.vue"), icon: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>' },
];
