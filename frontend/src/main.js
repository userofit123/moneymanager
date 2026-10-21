import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./i18n.js";
import { startMobile } from "./mobile.js";
import "./styles/tokens.css";
import "./styles/legacy.css";
import "./styles/base.css";

startMobile();
createApp(App).use(i18n).mount("#app");
