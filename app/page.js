import { getDataWithFallback } from "../lib/getData.js";
import growthFallback from "./data/growth-fallback.json";
import currentStateFallback from "./data/current-state-fallback.json";
import currentStateHistoryFallback from "./data/current-state-history-fallback.json";
import AppShell from "./AppShell.jsx";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [growth, currentState, currentStateHistory] = await Promise.all([
    getDataWithFallback("growth-data.json", growthFallback),
    getDataWithFallback("current-state-data.json", currentStateFallback),
    getDataWithFallback("current-state-history.json", currentStateHistoryFallback),
  ]);

  return <AppShell growth={growth} currentState={currentState} currentStateHistory={currentStateHistory} />;
}
