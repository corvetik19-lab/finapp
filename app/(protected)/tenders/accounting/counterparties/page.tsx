import { Metadata } from "next";
import { getCounterparties } from "@/lib/accounting/service";
import { CounterpartiesList } from "@/components/accounting/CounterpartiesList";

export const metadata: Metadata = {
  title: "Контрагенты | Бухгалтерия",
  description: "Заказчики и поставщики",
};

export default async function CounterpartiesPage() {
  const counterparties = await getCounterparties();

  return <CounterpartiesList counterparties={counterparties} />;
}
