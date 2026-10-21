import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./i18n.js";
import { startMobile } from "./mobile.js";
import "./styles/tokens.css";
import "./styles/legacy.css";
import "./styles/base.css";

import { startTooltips } from "./core/tooltip.js";
import { startDropdowns } from "./core/dropdown.js";
import { startPolish } from "./core/polish.js";
import { withErrors } from "./core/errors.js";

startMobile();
withErrors(createApp(App)).use(i18n).mount("#app"); // page errors go to Settings → Error log (core/errors.js)
startTooltips(i18n.global.t("shell.moreInfo"));
startDropdowns();
startPolish();
