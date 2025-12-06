import { getShipments } from "@/lib/logistics/service";
import { LogisticsList } from "@/components/logistics/logistics-list";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Логистика | Тендеры",
};

export const dynamic = "force-dynamic";

export default async function TenderLogisticsPage() {
  const shipments = await getShipments();

  return <LogisticsList initialShipments={shipments} />;
}
