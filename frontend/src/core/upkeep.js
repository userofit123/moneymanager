// Turns on the app's upkeep (core/settle.js) for the shared data: it runs after every load and every change.
// Points for setup steps and last month's results are recorded with it (core/points.js).
import { data } from "../stores/data.js";
import { settle } from "./settle.js";
import { pointsAfterUpkeep } from "./points.js";

data.hooks.settle = (S) => { const lines = settle(S, new Date(), data.fx.value.fx); pointsAfterUpkeep(S); return lines; };
