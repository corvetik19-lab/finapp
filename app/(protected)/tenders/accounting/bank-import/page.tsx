import { Metadata } from "next";
import { BankImportPage } from "@/components/accounting/import/BankImportPage";

export const metadata: Metadata = {
  title: "Импорт выписки | Бухгалтерия",
  description: "Импорт банковской выписки",
};

export default function BankImportRoute() {
  return <BankImportPage />;
}
