import { Suspense } from "react";
import { getSupplierCategories } from "@/lib/suppliers/service";
import { getImportHistory } from "@/lib/suppliers/import-service";
import { SupplierImportPage } from "@/components/suppliers/SupplierImportPage";

export const metadata = {
  title: "Импорт поставщиков | Поставщики",
};

export default async function ImportPage() {
  const [categories, importHistory] = await Promise.all([
    getSupplierCategories(),
    getImportHistory(5),
  ]);

  return (
    <Suspense fallback={<div className="p-6">Загрузка...</div>}>
      <SupplierImportPage 
        categories={categories} 
        importHistory={importHistory}
      />
    </Suspense>
  );
}
