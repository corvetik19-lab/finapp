import { Metadata } from "next";
import { getStock, getWarehouses } from "@/lib/accounting/warehouse/service";
import { WarehouseStockPage } from "@/components/accounting/warehouse/WarehouseStockPage";

export const metadata: Metadata = {
  title: "Остатки | Склад",
  description: "Остатки товаров на складах",
};

export default async function WarehouseStockRoute() {
  const [stock, warehouses] = await Promise.all([
    getStock(),
    getWarehouses(),
  ]);

  return <WarehouseStockPage stock={stock} warehouses={warehouses} />;
}
