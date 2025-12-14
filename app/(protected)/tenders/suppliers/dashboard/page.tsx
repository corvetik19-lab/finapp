import { SuppliersDashboard } from "@/components/suppliers/SuppliersDashboard";
import {
  getSupplierStats,
  getTopSuppliers,
  getSuppliersByCategory,
  getSuppliersByStatus,
  getMonthlyActivity,
} from "@/lib/suppliers/analytics-service";

export default async function SuppliersDashboardPage() {
  const [stats, topSuppliers, byCategory, byStatus, monthlyActivity] = await Promise.all([
    getSupplierStats(),
    getTopSuppliers(10),
    getSuppliersByCategory(),
    getSuppliersByStatus(),
    getMonthlyActivity(),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Аналитика поставщиков</h1>
        <p className="text-gray-500">Обзор статистики и ключевых показателей</p>
      </div>
      
      <SuppliersDashboard
        stats={stats}
        topSuppliers={topSuppliers}
        byCategory={byCategory}
        byStatus={byStatus}
        monthlyActivity={monthlyActivity}
      />
    </div>
  );
}
