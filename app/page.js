import { getDataWithFallback } from "../lib/getData.js";
import growthFallback from "./data/growth-fallback.json";
import currentStateFallback from "./data/current-state-fallback.json";
import AppShell from "./AppShell.jsx";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [growth, currentState] = await Promise.all([
    getDataWithFallback("growth-data.json", growthFallback),
    getDataWithFallback("current-state-data.json", currentStateFallback),
  ]);

  return <AppShell growth={growth} currentState={currentState} />;
}
