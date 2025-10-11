import { Metadata } from "next";
import AdvancedAnalyticsClient from "./AdvancedAnalyticsClient";

export const metadata: Metadata = {
  title: "Расширенная аналитика — FinApp",
  description: "Детальный анализ ваших финансов",
};

export default function AdvancedAnalyticsPage() {
  return <AdvancedAnalyticsClient />;
}
