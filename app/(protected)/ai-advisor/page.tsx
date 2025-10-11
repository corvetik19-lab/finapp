import { Metadata } from "next";
import AIAdvisorClient from "./AIAdvisorClient";

export const metadata: Metadata = {
  title: "AI Финансовый Советник — FinApp",
  description: "Персональный анализ финансового здоровья и рекомендации",
};

export default function AIAdvisorPage() {
  return <AIAdvisorClient />;
}
