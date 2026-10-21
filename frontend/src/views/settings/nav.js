// The Settings side list, copied from the current app's page (web/index.html, #setTabs): five groups, each with its sections and their icons.
// "pane" is the file that draws the section (loaded when it is opened).
export const NAV = [
  { group: "you", tabs: [
    { id: "prof", icon: "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7\"/>" },
    { id: "sec", icon: "<path d=\"M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z\"/><path d=\"M9 12l2 2 4-4\"/>" },
    { id: "pref", icon: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18\"/>" },
    { id: "cur", icon: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 9h4a2 2 0 0 1 0 4H9M9 15h5M12 7v10\"/>" },
  ] },
  { group: "banks", tabs: [
    { id: "conn", icon: "<path d=\"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1\"/>" },
    { id: "sync", icon: "<path d=\"M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5\"/>" },
  ] },
  { group: "data", tabs: [
    { id: "data", icon: "<ellipse cx=\"12\" cy=\"6\" rx=\"8\" ry=\"3\"/><path d=\"M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3\"/>" },
    { id: "backup", icon: "<path d=\"M12 15V4M8 8l4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5\"/>" },
    { id: "log", icon: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/>" },
  ] },
  { group: "alerts", tabs: [
    { id: "alr", icon: "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0\"/>" },
    { id: "notify", icon: "<rect x=\"7\" y=\"3\" width=\"10\" height=\"18\" rx=\"2\"/><path d=\"M11 18h2\"/>" },
  ] },
  { group: "about", tabs: [
    { id: "app", icon: "<path d=\"M12 4v11M7 11l5 5 5-5M5 20h14\"/>" },
    { id: "rel", icon: "<path d=\"M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5\"/>" },
    { id: "err", icon: "<path d=\"M12 3l10 18H2zM12 10v5M12 18v.01\"/>" },
  ] },
];

export const PANES = {
  prof: () => import("./ProfilePane.vue"),
  sec: () => import("./SecurityPane.vue"),
  pref: () => import("./PrefsPane.vue"),
  cur: () => import("./CurrenciesPane.vue"),
  conn: () => import("./ConnectionsPane.vue"),
  sync: () => import("./SyncPane.vue"),
  data: () => import("./DataPane.vue"),
  backup: () => import("./BackupPane.vue"),
  log: () => import("./HistoryPane.vue"),
  alr: () => import("./AlertsPane.vue"),
  notify: () => import("./NotifyPane.vue"),
  app: () => import("./AppPane.vue"),
  rel: () => import("./ReleasePane.vue"),
  err: () => import("./ErrorsPane.vue"),
};
