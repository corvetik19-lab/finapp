import { Metadata } from "next";
import { getOSV } from "@/lib/accounting/registers/service";
import { OSVReportPage } from "@/components/accounting/registers/OSVReportPage";

export const metadata: Metadata = {
  title: "ОСВ | Бухгалтерия",
  description: "Оборотно-сальдовая ведомость",
};

export default async function OSVRoute() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const report = await getOSV(
    startOfMonth.toISOString().split("T")[0],
    endOfMonth.toISOString().split("T")[0]
  );

  return (
    <OSVReportPage 
      initialReport={report}
      initialStartDate={startOfMonth.toISOString().split("T")[0]}
      initialEndDate={endOfMonth.toISOString().split("T")[0]}
    />
  );
}
