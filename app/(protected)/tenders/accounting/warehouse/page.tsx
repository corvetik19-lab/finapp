import { Metadata } from "next";
import { getWarehouses } from "@/lib/accounting/warehouse/service";
import { WarehousesPage } from "@/components/accounting/warehouse/WarehousesPage";

export const metadata: Metadata = {
  title: "Склады | Бухгалтерия",
  description: "Управление складами",
};

export default async function WarehousesRoute() {
  const warehouses = await getWarehouses();

  return <WarehousesPage warehouses={warehouses} />;
}
