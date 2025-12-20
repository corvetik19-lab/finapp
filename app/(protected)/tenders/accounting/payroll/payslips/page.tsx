import { Metadata } from "next";
import { getPayslips, getPayrollPeriods } from "@/lib/accounting/payroll/service";
import { PayrollPayslipsPage } from "@/components/accounting/payroll/PayrollPayslipsPage";

export const metadata: Metadata = {
  title: "Расчётные листки | Зарплата",
  description: "Расчётные листки сотрудников",
};

export default async function PayrollPayslipsRoute() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  const [payslips, periods] = await Promise.all([
    getPayslips({ year: currentYear, month: currentMonth }),
    getPayrollPeriods(currentYear),
  ]);

  return (
    <PayrollPayslipsPage 
      initialPayslips={payslips}
      periods={periods}
      initialYear={currentYear}
      initialMonth={currentMonth}
    />
  );
}
