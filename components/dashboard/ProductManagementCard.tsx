"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Package, ShoppingBasket, Eye, EyeOff, Loader2 } from "lucide-react";

export type ProductSummaryPeriod = "week" | "month" | "year" | "custom";

export type ProductSummaryItem = {
  name: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  transactionCount: number;
};

const PERIODS: { id: ProductSummaryPeriod; label: string }[] = [
  { id: "week", label: "Неделя" },
  { id: "month", label: "Месяц" },
  { id: "year", label: "Год" },
  { id: "custom", label: "Произвольно" },
];

const INITIAL_VISIBLE_COUNT = 6;

export type ProductManagementCardProps = {
  allProducts: ProductSummaryItem[];
  visibleProducts: string[];
  currency: string;
  from: string;
  to: string;
};

export default function ProductManagementCard({
  allProducts,
  visibleProducts: initialVisibleProducts,
  currency,
  from: initialFrom,
  to: initialTo,
}: ProductManagementCardProps) {
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState(allProducts);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [period, setPeriod] = useState<ProductSummaryPeriod>("month");
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: initialFrom.slice(0, 10),
    to: initialTo.slice(0, 10),
  });

  const [visibleIds, setVisibleIds] = useState<string[]>(() =>
    initialVisibleProducts.length > 0
      ? initialVisibleProducts
      : allProducts.slice(0, INITIAL_VISIBLE_COUNT).map((item) => item.name)
  );

  const [selectedHiddenId, setSelectedHiddenId] = useState<string | null>(() => {
    const defaults = allProducts.slice(INITIAL_VISIBLE_COUNT);
    return defaults[0]?.name ?? null;
  });

  // Загрузка данных при изменении периода
  useEffect(() => {
    if (period === "custom") return;

    const fetchData = async () => {
      startTransition(async () => {
        try {
          const response = await fetch(
            `/api/dashboard/products?period=${period}`
          );
          if (!response.ok) throw new Error("Failed to fetch products");
          const data = await response.json();
          setProducts(data.products);
          setError(null);
        } catch (err) {
          setError("Не удалось загрузить данные");
          console.error(err);
        }
      });
    };

    fetchData();
  }, [period]);

  // Применение произвольного периода
  const handleApplyCustomRange = () => {
    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/dashboard/products?from=${customRange.from}&to=${customRange.to}`
        );
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data.products);
        setError(null);
      } catch (err) {
        setError("Не удалось загрузить данные");
        console.error(err);
      }
    });
  };

  // Сохранение настроек видимости
  const savePreferences = async (newVisibleIds: string[]) => {
    setSaving(true);
    try {
      await fetch("/api/dashboard/product-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleProducts: newVisibleIds }),
      });
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  };

  // Переключение видимости товара
  const handleToggleVisibility = (productName: string) => {
    const newVisible = visibleIds.includes(productName)
      ? visibleIds.filter((id) => id !== productName)
      : [...visibleIds, productName];

    setVisibleIds(newVisible);
    savePreferences(newVisible);
  };

  // Добавление скрытого товара
  const handleAddHidden = () => {
    if (!selectedHiddenId) return;
    const newVisible = [...visibleIds, selectedHiddenId];
    setVisibleIds(newVisible);
    savePreferences(newVisible);

    const remaining = products.filter((p) => !newVisible.includes(p.name));
    setSelectedHiddenId(remaining[0]?.name ?? null);
  };

  const visibleProducts = useMemo(
    () => products.filter((p) => visibleIds.includes(p.name)),
    [products, visibleIds]
  );

  const hiddenProducts = useMemo(
    () => products.filter((p) => !visibleIds.includes(p.name)),
    [products, visibleIds]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Управление товарами
          </CardTitle>
          <Select value={period} onValueChange={(v) => setPeriod(v as ProductSummaryPeriod)} disabled={isPending}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customRange.from} onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))} className="h-8" />
            <span className="text-muted-foreground">—</span>
            <Input type="date" value={customRange.to} onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))} className="h-8" />
            <Button size="sm" onClick={handleApplyCustomRange} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Применить"}
            </Button>
          </div>
        )}

        {error && <div className="text-sm text-destructive">{error}</div>}

        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Нет данных по товарам</p>
            <p className="text-xs">Добавьте позиции товаров в транзакции, чтобы увидеть статистику</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visibleProducts.map((product) => (
                <div key={product.name} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <ShoppingBasket className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {product.quantity} {product.unit} • {product.transactionCount} покупок
                    </div>
                  </div>
                  <div className="text-sm font-medium">{formatMoney(Math.round(product.totalAmount * 100), currency)}</div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleVisibility(product.name)} title="Скрыть товар">
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {hiddenProducts.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Скрытые товары ({hiddenProducts.length})</div>
                <div className="flex gap-2">
                  <Select value={selectedHiddenId || ""} onValueChange={setSelectedHiddenId}>
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue placeholder="Выберите товар" />
                    </SelectTrigger>
                    <SelectContent>
                      {hiddenProducts.map((product) => (
                        <SelectItem key={product.name} value={product.name}>
                          {product.name} — {formatMoney(Math.round(product.totalAmount * 100), currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={handleAddHidden} disabled={!selectedHiddenId || saving}>
                    <Eye className="h-4 w-4 mr-1" />
                    Показать
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
