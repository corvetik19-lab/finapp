import { Metadata } from "next";
import { getWarehouseItems } from "@/lib/accounting/warehouse/service";
import { WarehouseItemsPage } from "@/components/accounting/warehouse/WarehouseItemsPage";

export const metadata: Metadata = {
  title: "Номенклатура | Склад",
  description: "Справочник номенклатуры",
};

export default async function WarehouseItemsRoute() {
  const items = await getWarehouseItems();

  return <WarehouseItemsPage items={items} />;
}
