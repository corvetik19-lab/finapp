import { Metadata } from "next";
import { getAdvanceReports } from "@/lib/accounting/documents/advance-reports-service";
import { AdvanceReportsPage } from "@/components/accounting/documents/AdvanceReportsPage";

export const metadata: Metadata = {
  title: "Авансовые отчёты | Бухгалтерия",
  description: "Авансовые отчёты (форма АО-1)",
};

export default async function AdvanceReportsRoute() {
  const reports = await getAdvanceReports();

  return <AdvanceReportsPage reports={reports} />;
}
