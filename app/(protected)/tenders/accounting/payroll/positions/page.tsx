import { Metadata } from "next";
import { getPositions } from "@/lib/accounting/payroll/service";
import { PayrollPositionsPage } from "@/components/accounting/payroll/PayrollPositionsPage";

export const metadata: Metadata = {
  title: "Должности | Зарплата",
  description: "Штатное расписание и должности",
};

export default async function PayrollPositionsRoute() {
  const positions = await getPositions();

  return <PayrollPositionsPage positions={positions} />;
}
