import { Metadata } from "next";
import ForecastsClient from "./ForecastsClient";

export const metadata: Metadata = {
  title: "Финансовые прогнозы — FinApp",
  description: "AI прогнозы расходов и сценарии 'Что если?'",
};

export const dynamic = 'force-dynamic';

export default function ForecastsPage() {
  return <ForecastsClient />;
}
