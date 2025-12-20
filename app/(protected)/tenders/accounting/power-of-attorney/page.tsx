import { Metadata } from "next";
import { getPowerOfAttorneys } from "@/lib/accounting/documents/power-of-attorney";
import { getCounterparties } from "@/lib/accounting/service";
import { PowerOfAttorneyPage } from "@/components/accounting/documents/PowerOfAttorneyPage";

export const metadata: Metadata = {
  title: "Доверенности | Бухгалтерия",
  description: "Доверенности на получение ТМЦ (форма М-2)",
};

export default async function PowerOfAttorneyRoute() {
  const [poas, counterparties] = await Promise.all([
    getPowerOfAttorneys(),
    getCounterparties(),
  ]);

  return (
    <PowerOfAttorneyPage 
      poas={poas} 
      counterparties={counterparties} 
    />
  );
}
