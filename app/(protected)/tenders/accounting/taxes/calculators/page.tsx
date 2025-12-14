import { Metadata } from "next";
import { TaxCalculatorsPage } from "@/components/accounting/TaxCalculatorsPage";

export const metadata: Metadata = {
  title: "Калькуляторы налогов | Бухгалтерия",
  description: "Расчёт налогов УСН, НДС и страховых взносов",
};

export default function TaxCalculatorsPageRoute() {
  return <TaxCalculatorsPage />;
}
