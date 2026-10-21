import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./i18n.js";
import { startMobile } from "./mobile.js";
import "./styles/tokens.css";
import "./styles/legacy.css";
import "./styles/base.css";

import { startTooltips } from "./core/tooltip.js";
import { startDropdowns } from "./core/dropdown.js";

startMobile();
createApp(App).use(i18n).mount("#app");
startTooltips(i18n.global.t("shell.moreInfo"));
startDropdowns();
