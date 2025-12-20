import { Metadata } from "next";
import { getWarehouseDocuments } from "@/lib/accounting/warehouse/service";
import { WarehouseDocumentsPage } from "@/components/accounting/warehouse/WarehouseDocumentsPage";

export const metadata: Metadata = {
  title: "Документы | Склад",
  description: "Складские документы",
};

export default async function WarehouseDocumentsRoute() {
  const documents = await getWarehouseDocuments();

  return <WarehouseDocumentsPage documents={documents} />;
}
