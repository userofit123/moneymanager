import { createApp } from "vue";
import App from "./App.vue";
import { i18n, i18nReady } from "./i18n.js";
import { startMobile } from "./mobile.js";
import "./styles/index.css"; // every app-wide style; each page imports its own from styles/pages/

import { startTooltips } from "./core/tooltip.js";
import { startDropdowns } from "./core/dropdown.js";
import { startPolish } from "./core/polish.js";
import { startSegSlide } from "./core/segSlide.js";
import { startDetails } from "./core/details.js";
import { withErrors } from "./core/errors.js";

startMobile();
// The app starts once the texts of the saved language are here (i18n.js).
i18nReady.then(() => {
  withErrors(createApp(App)).use(i18n).mount("#app"); // page errors go to Settings → Error log (core/errors.js)
  startTooltips(i18n.global.t("shell.moreInfo"));
  startDropdowns();
  startPolish();
  startSegSlide();
  startDetails();
});
