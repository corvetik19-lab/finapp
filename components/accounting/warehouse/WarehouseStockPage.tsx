"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Package, Warehouse, AlertTriangle, Download } from "lucide-react";
import { WarehouseStock, WarehouseLocation } from "@/lib/accounting/warehouse/types";

interface WarehouseStockPageProps {
  stock: WarehouseStock[];
  warehouses: WarehouseLocation[];
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function WarehouseStockPage({ stock, warehouses }: WarehouseStockPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);

  const filteredStock = stock.filter((s) => {
    const matchesSearch =
      (s.item as WarehouseStock["item"] & { name?: string })?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const matchesWarehouse = warehouseFilter === "all" || s.warehouse_id === warehouseFilter;
    const matchesLowStock = !showLowStock || (s.min_quantity && s.quantity <= s.min_quantity);
    return matchesSearch && matchesWarehouse && matchesLowStock;
  });

  const totalValue = stock.reduce((sum, s) => sum + (s.total_value || 0), 0);
  const lowStockCount = stock.filter((s) => s.min_quantity && s.quantity <= s.min_quantity).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Остатки на складах</h1>
          <p className="text-muted-foreground">
            Текущие остатки товаров и материалов
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Позиций на учёте</div>
                <div className="text-2xl font-bold">{stock.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Общая стоимость</div>
            <div className="text-2xl font-bold">{formatMoney(totalValue)} ₽</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Складов</div>
            <div className="text-2xl font-bold">{warehouses.length}</div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-orange-200 bg-orange-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? "text-orange-500" : ""}`} />
              Ниже минимума
            </div>
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? "text-orange-600" : ""}`}>
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по товару..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Все склады" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все склады</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showLowStock ? "default" : "outline"}
          onClick={() => setShowLowStock(!showLowStock)}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Ниже минимума
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Остатки ({filteredStock.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Товар</TableHead>
                <TableHead>Склад</TableHead>
                <TableHead className="text-right">Количество</TableHead>
                <TableHead className="text-right">Мин. остаток</TableHead>
                <TableHead className="text-right">Резерв</TableHead>
                <TableHead className="text-right">Доступно</TableHead>
                <TableHead className="text-right">Стоимость</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.map((s) => {
                const isLowStock = s.min_quantity && s.quantity <= s.min_quantity;
                const available = s.quantity - s.reserved_quantity;
                return (
                  <TableRow key={s.id} className={isLowStock ? "bg-orange-50" : ""}>
                    <TableCell className="font-medium">
                      {(s.item as WarehouseStock["item"] & { name?: string })?.name || "—"}
                    </TableCell>
                    <TableCell>
                      {(s.warehouse as WarehouseStock["warehouse"] & { name?: string })?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {s.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {s.min_quantity || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {s.reserved_quantity > 0 ? (
                        <Badge variant="secondary">{s.reserved_quantity}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {available}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatMoney(s.total_value || 0)} ₽
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredStock.length > 0 && (
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={6}>Итого</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMoney(filteredStock.reduce((sum, s) => sum + (s.total_value || 0), 0))} ₽
                  </TableCell>
                </TableRow>
              )}
              {filteredStock.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Остатки не найдены</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
