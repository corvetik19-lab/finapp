import { SuppliersMap } from "@/components/suppliers/SuppliersMap";
import {
  getSuppliersWithLocation,
  getGeocodingStats,
} from "@/lib/suppliers/geolocation-service";

export default async function SuppliersMapPage() {
  const [suppliers, stats] = await Promise.all([
    getSuppliersWithLocation(),
    getGeocodingStats(),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Карта поставщиков</h1>
        <p className="text-gray-500">Геолокация и поиск по радиусу</p>
      </div>

      <SuppliersMap suppliers={suppliers} stats={stats} />
    </div>
  );
}
