// The code checker (npm run lint): catches mistakes such as unused or misspelled names and Vue template errors.
// It does not change how code is laid out.
import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import globals from "globals";

export default [
  { ignores: ["dist/", "public/"] },
  js.configs.recommended,
  ...vue.configs["flat/essential"],
  {
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: { ...globals.browser } },
    rules: {
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      "vue/multi-word-component-names": "off", // page names like Home.vue are fine
      "vue/no-v-html": "off", // used on purpose for icons and help text built from our own strings
    },
  },
  { files: ["test/**", "*.config.js", "vite-dots.js"], languageOptions: { globals: { ...globals.node } } },
];
