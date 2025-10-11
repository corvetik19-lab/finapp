import { Metadata } from "next";
import ForecastsClient from "./ForecastsClient";

export const metadata: Metadata = {
  title: "Финансовые прогнозы — FinApp",
  description: "AI прогнозы расходов и сценарии 'Что если?'",
};

export default function ForecastsPage() {
  return <ForecastsClient />;
}
