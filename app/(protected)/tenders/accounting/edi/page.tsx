import { Metadata } from "next";
import { getEdiSettings, getEdiStats, getIncomingEdiDocuments } from "@/lib/accounting/edi/diadoc-service";
import { EdiDashboard } from "@/components/accounting/edi/EdiDashboard";

export const metadata: Metadata = {
  title: "ЭДО | Бухгалтерия",
  description: "Электронный документооборот",
};

export default async function EdiPage() {
  const [settings, stats, { documents }] = await Promise.all([
    getEdiSettings(),
    getEdiStats(),
    getIncomingEdiDocuments(),
  ]);

  return (
    <EdiDashboard 
      settings={settings}
      stats={stats}
      documents={documents}
    />
  );
}
