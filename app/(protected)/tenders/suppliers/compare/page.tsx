import { SupplierComparison } from "@/components/suppliers/SupplierComparison";
import { getSuppliers, getSupplierCategories } from "@/lib/suppliers/service";
import { getSupplierContracts } from "@/lib/suppliers/contracts-service";

export default async function SuppliersComparePage() {
  const [suppliers, categories] = await Promise.all([
    getSuppliers(),
    getSupplierCategories(),
  ]);

  // Загружаем договоры для каждого поставщика
  const suppliersWithData = await Promise.all(
    suppliers.map(async (supplier) => {
      const contracts = await getSupplierContracts(supplier.id);
      return {
        ...supplier,
        contracts,
      };
    })
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Сравнение поставщиков</h1>
        <p className="text-gray-500">Выберите до 5 поставщиков для сравнения по различным критериям</p>
      </div>
      
      <SupplierComparison 
        suppliers={suppliersWithData} 
        categories={categories} 
      />
    </div>
  );
}
