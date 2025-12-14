import { Metadata } from "next";
import { Export1CPage } from "@/components/accounting/export/Export1CPage";

export const metadata: Metadata = {
  title: "Экспорт в 1С | Бухгалтерия",
  description: "Выгрузка данных в формате 1С",
};

export default function ExportPage() {
  return <Export1CPage />;
}
