import { Metadata } from "next";
import { getJournalEntries } from "@/lib/accounting/registers/service";
import { JournalEntriesPage } from "@/components/accounting/registers/JournalEntriesPage";

export const metadata: Metadata = {
  title: "Журнал проводок | Бухгалтерия",
  description: "Журнал бухгалтерских проводок",
};

export default async function JournalRoute() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const entries = await getJournalEntries({
    startDate: startOfMonth.toISOString().split("T")[0],
    endDate: endOfMonth.toISOString().split("T")[0],
  });

  return (
    <JournalEntriesPage 
      initialEntries={entries}
      initialStartDate={startOfMonth.toISOString().split("T")[0]}
      initialEndDate={endOfMonth.toISOString().split("T")[0]}
    />
  );
}
