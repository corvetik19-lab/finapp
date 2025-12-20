import { Metadata } from "next";
import { getEmployees } from "@/lib/accounting/payroll/service";
import { PayrollEmployeesPage } from "@/components/accounting/payroll/PayrollEmployeesPage";

export const metadata: Metadata = {
  title: "Сотрудники | Зарплата",
  description: "Управление сотрудниками и расчёт зарплаты",
};

export default async function PayrollEmployeesRoute() {
  const employees = await getEmployees();

  return <PayrollEmployeesPage employees={employees} />;
}
