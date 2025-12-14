import { SuppliersDuplicates } from "@/components/suppliers/SuppliersDuplicates";
import {
  findDuplicates,
  getDuplicatesStats,
} from "@/lib/suppliers/duplicates-service";

export default async function SuppliersDuplicatesPage() {
  const [duplicates, stats] = await Promise.all([
    findDuplicates(),
    getDuplicatesStats(),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Дубликаты поставщиков</h1>
        <p className="text-gray-500">Поиск и объединение повторяющихся карточек</p>
      </div>

      <SuppliersDuplicates duplicates={duplicates} stats={stats} />
    </div>
  );
}
