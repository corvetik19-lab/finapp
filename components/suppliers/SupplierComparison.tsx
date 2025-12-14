"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scale,
  Star,
  Building2,
  X,
  Download,
  CheckCircle,
} from "lucide-react";
import {
  Supplier,
  SupplierCategory,
  SupplierContract,
  SUPPLIER_STATUSES,
  PAYMENT_TERMS,
  PaymentTerms,
} from "@/lib/suppliers/types";

interface SupplierWithData extends Supplier {
  contracts?: SupplierContract[];
  totalPurchases?: number;
  avgDeliveryDays?: number;
  returnRate?: number;
}

interface SupplierComparisonProps {
  suppliers: SupplierWithData[];
  categories: SupplierCategory[];
}

const COMPARISON_CRITERIA = [
  { key: "rating", label: "Рейтинг", type: "rating" },
  { key: "status", label: "Статус", type: "status" },
  { key: "phone", label: "Телефон", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "category", label: "Категория", type: "category" },
  { key: "inn", label: "ИНН", type: "text" },
  { key: "payment_terms", label: "Условия оплаты", type: "payment" },
  { key: "active_contracts", label: "Действующие договоры", type: "number" },
  { key: "total_purchases", label: "Объём закупок", type: "currency" },
  { key: "avg_delivery", label: "Ср. срок доставки", type: "days" },
  { key: "return_rate", label: "Процент возвратов", type: "percent" },
];

export function SupplierComparison({ suppliers, categories }: SupplierComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (categoryFilter !== "all" && s.category_id !== categoryFilter) return false;
      return true;
    });
  }, [suppliers, categoryFilter]);

  const selectedSuppliers = useMemo(() => {
    return suppliers.filter((s) => selectedIds.has(s.id));
  }, [suppliers, selectedIds]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else if (newSet.size < 5) {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "—";
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || "—";
  };

  const getPaymentTerms = (supplier: SupplierWithData) => {
    const activeContract = supplier.contracts?.find((c) => c.status === "active");
    if (!activeContract?.payment_terms) return "—";
    return PAYMENT_TERMS[activeContract.payment_terms as PaymentTerms] || "—";
  };

  const getActiveContractsCount = (supplier: SupplierWithData) => {
    return supplier.contracts?.filter((c) => c.status === "active").length || 0;
  };

  const getCellValue = (supplier: SupplierWithData, criterion: typeof COMPARISON_CRITERIA[0]) => {
    switch (criterion.key) {
      case "rating":
        return supplier.rating || 0;
      case "status":
        return supplier.status;
      case "phone":
        return supplier.phone || "—";
      case "email":
        return supplier.email || "—";
      case "category":
        return getCategoryName(supplier.category_id);
      case "inn":
        return supplier.inn || "—";
      case "payment_terms":
        return getPaymentTerms(supplier);
      case "active_contracts":
        return getActiveContractsCount(supplier);
      case "total_purchases":
        return supplier.totalPurchases || 0;
      case "avg_delivery":
        return supplier.avgDeliveryDays || 0;
      case "return_rate":
        return supplier.returnRate || 0;
      default:
        return "—";
    }
  };

  const renderCellValue = (value: unknown, type: string): React.ReactNode => {
    switch (type) {
      case "rating":
        const rating = value as number;
        return (
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
              />
            ))}
          </div>
        );
      case "status":
        const statusInfo = SUPPLIER_STATUSES[value as keyof typeof SUPPLIER_STATUSES];
        const variants: Record<string, "default" | "secondary" | "destructive"> = {
          green: "default",
          gray: "secondary",
          red: "destructive",
        };
        return <Badge variant={variants[statusInfo?.color] || "secondary"}>{statusInfo?.name || String(value)}</Badge>;
      case "currency":
        return new Intl.NumberFormat("ru-RU", {
          style: "currency",
          currency: "RUB",
          minimumFractionDigits: 0,
        }).format((value as number) / 100);
      case "days":
        return value ? `${value} дн.` : "—";
      case "percent":
        return value ? `${(value as number).toFixed(1)}%` : "—";
      case "number":
        return String(value || 0);
      default:
        return String(value);
    }
  };

  const getBestValue = (key: string, values: unknown[]) => {
    const numValues = values.filter((v) => typeof v === "number") as number[];
    if (numValues.length === 0) return null;

    switch (key) {
      case "rating":
      case "active_contracts":
      case "total_purchases":
        return Math.max(...numValues);
      case "avg_delivery":
      case "return_rate":
        return Math.min(...numValues.filter((v) => v > 0));
      default:
        return null;
    }
  };

  const exportComparison = () => {
    const headers = ["Критерий", ...selectedSuppliers.map((s) => s.name)];
    const rows = COMPARISON_CRITERIA.map((c) => [
      c.label,
      ...selectedSuppliers.map((s) => String(getCellValue(s, c))),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers-comparison-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Выбор поставщиков */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Выберите поставщиков для сравнения (макс. 5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Сбросить ({selectedIds.size})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
            {filteredSuppliers.map((supplier) => {
              const isSelected = selectedIds.has(supplier.id);
              const isDisabled = !isSelected && selectedIds.size >= 5;

              return (
                <div
                  key={supplier.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={() => !isDisabled && toggleSelect(supplier.id)}
                >
                  <Checkbox checked={isSelected} disabled={isDisabled} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{supplier.name}</p>
                    <p className="text-xs text-gray-500">{getCategoryName(supplier.category_id)}</p>
                  </div>
                  {supplier.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {supplier.rating}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Таблица сравнения */}
      {selectedSuppliers.length >= 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Сравнение</CardTitle>
            <Button variant="outline" size="sm" onClick={exportComparison}>
              <Download className="h-4 w-4 mr-1" />
              Экспорт CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Критерий</TableHead>
                    {selectedSuppliers.map((s) => (
                      <TableHead key={s.id} className="min-w-40">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">{s.name}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPARISON_CRITERIA.map((criterion) => {
                    const values = selectedSuppliers.map((s) => getCellValue(s, criterion));
                    const bestValue = getBestValue(criterion.key, values);

                    return (
                      <TableRow key={criterion.key}>
                        <TableCell className="font-medium">{criterion.label}</TableCell>
                        {selectedSuppliers.map((supplier, idx) => {
                          const value = values[idx];
                          const isBest = bestValue !== null && value === bestValue;

                          return (
                            <TableCell
                              key={supplier.id}
                              className={isBest ? "bg-green-50" : ""}
                            >
                              <div className="flex items-center gap-2">
                                {renderCellValue(value, criterion.type)}
                                {isBest && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSuppliers.length === 1 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Выберите ещё хотя бы одного поставщика для сравнения</p>
          </CardContent>
        </Card>
      )}

      {selectedSuppliers.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Выберите поставщиков для сравнения</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
