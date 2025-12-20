import { Metadata } from "next";
import { getPayrollPeriods } from "@/lib/accounting/payroll/service";
import { PayrollPeriodsPage } from "@/components/accounting/payroll/PayrollPeriodsPage";

export const metadata: Metadata = {
  title: "Расчётные периоды | Зарплата",
  description: "Управление расчётными периодами",
};

export default async function PayrollPeriodsRoute() {
  const currentYear = new Date().getFullYear();
  const periods = await getPayrollPeriods(currentYear);

  return (
    <PayrollPeriodsPage 
      initialPeriods={periods}
      initialYear={currentYear}
    />
  );
}
