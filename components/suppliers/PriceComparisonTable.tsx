"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingDown,
  Minus,
  Download,
  Filter,
} from "lucide-react";
import { formatMoney } from "@/lib/utils/format";

// =====================================================
// Таблица сравнения цен
// =====================================================

export interface PriceComparisonItem {
  id?: string;
  article?: string;
  name: string;
  unit?: string;
  prices: {
    supplierId: string;
    supplierName: string;
    price: number; // в копейках
    oldPrice?: number;
    inStock?: boolean;
    deliveryDays?: number;
  }[];
}

interface PriceComparisonTableProps {
  items: PriceComparisonItem[];
  onExport?: () => void;
}

type SortField = "name" | "article" | "minPrice" | "maxPrice" | "priceDiff";
type SortDirection = "asc" | "desc";

export function PriceComparisonTable({
  items,
  onExport,
}: PriceComparisonTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showOnlyWithDiff, setShowOnlyWithDiff] = useState(false);

  // Получаем список всех поставщиков
  const suppliers = useMemo(() => {
    const supplierMap = new Map<string, string>();
    items.forEach((item) => {
      item.prices.forEach((p) => {
        supplierMap.set(p.supplierId, p.supplierName);
      });
    });
    return Array.from(supplierMap.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Обработанные данные для таблицы
  const processedItems = useMemo(() => {
    return items.map((item) => {
      const prices = item.prices.map((p) => p.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const priceDiff = maxPrice - minPrice;
      const priceDiffPercent = minPrice > 0 ? Math.round((priceDiff / minPrice) * 100) : 0;

      return {
        ...item,
        minPrice,
        maxPrice,
        priceDiff,
        priceDiffPercent,
      };
    });
  }, [items]);

  // Фильтрация и сортировка
  const filteredItems = useMemo(() => {
    let result = processedItems;

    // Поиск
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.article?.toLowerCase().includes(searchLower)
      );
    }

    // Только с разницей в ценах
    if (showOnlyWithDiff) {
      result = result.filter((item) => item.priceDiff > 0);
    }

    // Сортировка
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "article":
          comparison = (a.article || "").localeCompare(b.article || "");
          break;
        case "minPrice":
          comparison = a.minPrice - b.minPrice;
          break;
        case "maxPrice":
          comparison = a.maxPrice - b.maxPrice;
          break;
        case "priceDiff":
          comparison = a.priceDiff - b.priceDiff;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [processedItems, search, showOnlyWithDiff, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  // Статистика
  const stats = useMemo(() => {
    const withDiff = processedItems.filter((i) => i.priceDiff > 0);
    const totalSavings = withDiff.reduce((sum, i) => sum + i.priceDiff, 0);
    const avgDiffPercent =
      withDiff.length > 0
        ? Math.round(withDiff.reduce((sum, i) => sum + i.priceDiffPercent, 0) / withDiff.length)
        : 0;

    return {
      totalItems: processedItems.length,
      itemsWithDiff: withDiff.length,
      totalSavings,
      avgDiffPercent,
    };
  }, [processedItems]);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Сравнение цен</CardTitle>
          <div className="flex items-center gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Экспорт
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Статистика */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-accent rounded">
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <div className="text-xs text-muted-foreground">Позиций</div>
          </div>
          <div className="text-center p-3 bg-accent rounded">
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <div className="text-xs text-muted-foreground">Поставщиков</div>
          </div>
          <div className="text-center p-3 bg-accent rounded">
            <div className="text-2xl font-bold text-green-600">
              {formatMoney(stats.totalSavings, "RUB")}
            </div>
            <div className="text-xs text-muted-foreground">Макс. экономия</div>
          </div>
          <div className="text-center p-3 bg-accent rounded">
            <div className="text-2xl font-bold">{stats.avgDiffPercent}%</div>
            <div className="text-xs text-muted-foreground">Средн. разница</div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или артикулу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showOnlyWithDiff ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyWithDiff(!showOnlyWithDiff)}
          >
            <Filter className="h-4 w-4 mr-1" />
            С разницей ({stats.itemsWithDiff})
          </Button>
        </div>

        {/* Таблица */}
        <div className="border rounded-lg overflow-auto max-h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSort("article")}
                >
                  Артикул <SortIcon field="article" />
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSort("name")}
                >
                  Название <SortIcon field="name" />
                </TableHead>
                {suppliers.map((supplier) => (
                  <TableHead key={supplier.id} className="text-right">
                    {supplier.name}
                  </TableHead>
                ))}
                <TableHead
                  className="text-right cursor-pointer hover:bg-accent"
                  onClick={() => handleSort("priceDiff")}
                >
                  Разница <SortIcon field="priceDiff" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="font-mono text-sm">
                    {item.article || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <div className="font-medium truncate">{item.name}</div>
                      {item.unit && (
                        <div className="text-xs text-muted-foreground">
                          {item.unit}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  {suppliers.map((supplier) => {
                    const priceInfo = item.prices.find(
                      (p) => p.supplierId === supplier.id
                    );
                    const isMinPrice = priceInfo && priceInfo.price === item.minPrice;
                    const isMaxPrice =
                      priceInfo && priceInfo.price === item.maxPrice && item.priceDiff > 0;

                    return (
                      <TableCell
                        key={supplier.id}
                        className={`text-right ${
                          isMinPrice
                            ? "bg-green-50 text-green-700 font-medium"
                            : isMaxPrice
                            ? "bg-red-50 text-red-700"
                            : ""
                        }`}
                      >
                        {priceInfo ? (
                          <div>
                            <div>{formatMoney(priceInfo.price, "RUB")}</div>
                            {priceInfo.oldPrice && priceInfo.oldPrice > priceInfo.price && (
                              <div className="text-xs line-through text-muted-foreground">
                                {formatMoney(priceInfo.oldPrice, "RUB")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    {item.priceDiff > 0 ? (
                      <div className="flex items-center justify-end gap-1">
                        <TrendingDown className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {formatMoney(item.priceDiff, "RUB")}
                        </span>
                        <Badge variant="outline" className="ml-1">
                          {item.priceDiffPercent}%
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end text-muted-foreground">
                        <Minus className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Позиции не найдены
          </div>
        )}
      </CardContent>
    </Card>
  );
}
