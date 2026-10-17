// The new app's pages by address, the same addresses as the old app (for example /app/activity is the old /activity).
// "old" is where that page lives in the current app, for pages not moved yet. "nav" pages show in the side and bottom menus;
// "main" ones also show in the phone's bottom bar (the rest are under More), like the current app.
export const BASE = "/app";
export const pages = [
  { name: "recap", path: "/recap", old: "/recap", nav: true, icon: "M4 18h16M7 18a5 5 0 0 1 10 0M12 4v3M5.6 8.6l1.8 1.8M18.4 8.6l-1.8 1.8" },
  { name: "home", path: "/home", nav: true, main: true, icon: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", component: () => import("./views/Home.vue") },
  { name: "accounts", path: "/accounts", old: "/accounts", nav: true, icon: "M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M16 15h2" },
  { name: "activity", path: "/activity", nav: true, main: true, icon: "M4 6h16M4 12h16M4 18h10", component: () => import("./views/Activity.vue") },
  { name: "jars", path: "/jars", nav: true, main: true, icon: "M7 3h10v3H7zM6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z", component: () => import("./views/Jars.vue") },
  { name: "bills", path: "/bills", old: "/bills", nav: true, main: true, icon: "M6 3h12v18H6zM8 8h8M8 12h8M8 16h5" },
  { name: "budgets", path: "/budgets", old: "/budgets", nav: true, icon: "M12 3a9 9 0 1 0 9 9h-9z M14 3.2A9 9 0 0 1 20.8 10H14z" },
  { name: "reports", path: "/reports", old: "/reports", nav: true, icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { name: "forecast", path: "/forecast", old: "/fc", nav: true, icon: "M3 17l6-6 4 4 8-8M15 7h6v6" },
  { name: "alerts", path: "/alerts", old: "/alerts", nav: true, icon: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4" },
  { name: "categories", path: "/categories", old: "/categories", nav: true, icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { name: "settings", path: "/settings", old: "/settings", nav: true, icon: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" },
  // Not in the menus: the shared building blocks, to check the look in both languages.
  { name: "parts", path: "/parts", component: () => import("./views/Parts.vue") },
];
// Kept for code that imported the old list.
export const routes = pages.filter((p) => p.component).map(({ path, component }) => ({ path, component }));
