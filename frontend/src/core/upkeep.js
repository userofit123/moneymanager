// Turns on the app's upkeep (core/settle.js) for the shared data: it runs after every load and every change.
import { data } from "../stores/data.js";
import { settle } from "./settle.js";

data.hooks.settle = (S) => settle(S, new Date(), data.fx.value.fx);
