import { getShipments } from "@/lib/logistics/service";
import { ShipmentsManager } from "@/components/logistics/ShipmentsManager";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Логистика | CRM",
};

export const dynamic = "force-dynamic";

export default async function LogisticsPage() {
  const shipments = await getShipments();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <ShipmentsManager initialShipments={shipments} />
    </div>
  );
}
