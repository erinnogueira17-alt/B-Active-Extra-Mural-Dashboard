import { WEEKLY_1_TO_5 } from "./weeks1to5.js";
import { WEEKLY_9_AND_18, GAME_PLAY_COACHING } from "./weeks9and18.js";

// All weekly plans, in week order. Each week has the five sports, and each
// sport has a focus line and three age groups.
export const WEEKLY_PLANS = [...WEEKLY_1_TO_5, ...WEEKLY_9_AND_18].sort((a, b) => a.week - b.week);

// Age groups as they appear on the sheets. The keys are used in the data.
export const WEEKLY_AGES = [
  { key: "baby", label: "Baby (18–36 months)" },
  { key: "4-6", label: "4–6 years" },
  { key: "primary", label: "Primary school (7+)" },
];

export { GAME_PLAY_COACHING };
