import { Metadata } from "next";
import ExportClient from "./ExportClient";

export const metadata: Metadata = {
  title: "Экспорт отчётов — FinApp",
  description: "Экспорт финансовых отчётов в PDF и Excel",
};

export default function ExportPage() {
  return <ExportClient />;
}
