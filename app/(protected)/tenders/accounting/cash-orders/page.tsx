import { Metadata } from "next";
import { getCashOrders, getCashBalance } from "@/lib/accounting/documents/cash-orders";
import { getCounterparties } from "@/lib/accounting/service";
import { CashOrdersPage } from "@/components/accounting/documents/CashOrdersPage";

export const metadata: Metadata = {
  title: "Кассовые ордера | Бухгалтерия",
  description: "ПКО и РКО (приходные и расходные кассовые ордера)",
};

export default async function CashOrdersRoute() {
  const [orders, counterparties, cashBalance] = await Promise.all([
    getCashOrders(),
    getCounterparties(),
    getCashBalance(),
  ]);

  return (
    <CashOrdersPage 
      orders={orders}
      counterparties={counterparties}
      cashBalance={cashBalance}
    />
  );
}
