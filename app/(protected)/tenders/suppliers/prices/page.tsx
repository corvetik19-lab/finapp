"use client";

import { PriceComparisonTable, PriceComparisonItem } from "@/components/suppliers/PriceComparisonTable";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function PriceComparisonPage() {
  // Демо данные для сравнения цен
  const demoItems: PriceComparisonItem[] = [
    {
      id: "1",
      article: "АРТ-001",
      name: "Бумага А4 500 листов",
      unit: "пачка",
      prices: [
        { supplierId: "s1", supplierName: "ООО Альфа-Снаб", price: 35000, oldPrice: 38000 },
        { supplierId: "s2", supplierName: "ООО БетаТрейд", price: 37500 },
        { supplierId: "s3", supplierName: "ИП Сидоров", price: 33000, inStock: true, deliveryDays: 3 },
      ],
    },
    {
      id: "2",
      article: "АРТ-002",
      name: "Папка-скоросшиватель",
      unit: "шт",
      prices: [
        { supplierId: "s1", supplierName: "ООО Альфа-Снаб", price: 4500 },
        { supplierId: "s2", supplierName: "ООО БетаТрейд", price: 4200, oldPrice: 4800 },
        { supplierId: "s3", supplierName: "ИП Сидоров", price: 4800 },
      ],
    },
    {
      id: "3",
      article: "АРТ-003",
      name: "Ручка шариковая синяя",
      unit: "шт",
      prices: [
        { supplierId: "s1", supplierName: "ООО Альфа-Снаб", price: 1200 },
        { supplierId: "s2", supplierName: "ООО БетаТрейд", price: 1500 },
        { supplierId: "s3", supplierName: "ИП Сидоров", price: 1100, inStock: true },
      ],
    },
    {
      id: "4",
      article: "АРТ-004",
      name: "Степлер №24",
      unit: "шт",
      prices: [
        { supplierId: "s1", supplierName: "ООО Альфа-Снаб", price: 25000 },
        { supplierId: "s2", supplierName: "ООО БетаТрейд", price: 22000 },
      ],
    },
    {
      id: "5",
      article: "АРТ-005",
      name: "Карандаш простой HB",
      unit: "шт",
      prices: [
        { supplierId: "s1", supplierName: "ООО Альфа-Снаб", price: 800 },
        { supplierId: "s2", supplierName: "ООО БетаТрейд", price: 750 },
        { supplierId: "s3", supplierName: "ИП Сидоров", price: 900 },
      ],
    },
  ];

  const handleExport = () => {
    alert("Экспорт в Excel...");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Сравнение цен</h1>
          <p className="text-muted-foreground">
            Анализ и сравнение цен от разных поставщиков
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Загрузить прайс
          </Button>
        </div>
      </div>

      <PriceComparisonTable items={demoItems} onExport={handleExport} />
    </div>
  );
}
