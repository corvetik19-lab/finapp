"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, ShoppingBasket, Eye, EyeOff, Loader2, ArrowLeftRight, X } from "lucide-react";

export type ProductSummaryPeriod = "week" | "month" | "year" | "custom";

export type ProductSummaryItem = {
  name: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  transactionCount: number;
};

export type ProductTransactionItem = {
  id: string;
  date: string;
  amount: number;
  quantity: number;
  unit: string;
  note?: string;
};

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const getAvailableYears = () => {
  const currentYear = new Date().getFullYear();
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
};

const getMonthRange = (year: number, month: number) => {
  // Используем UTC чтобы избежать проблем с часовыми поясами
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
};

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
}: ProductManagementCardProps) {
  const [isPending, startTransition] = useTransition();
  const now = new Date();

  const [products, setProducts] = useState(allProducts);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  
  const [compareMode, setCompareMode] = useState(false);
  const [compareYear, setCompareYear] = useState(now.getFullYear());
  const [compareMonth, setCompareMonth] = useState(now.getMonth() > 0 ? now.getMonth() - 1 : 11);
  const [compareProducts, setCompareProducts] = useState<ProductSummaryItem[]>([]);

  const [visibleIds, setVisibleIds] = useState<string[]>(() =>
    initialVisibleProducts.length > 0
      ? initialVisibleProducts
      : allProducts.slice(0, INITIAL_VISIBLE_COUNT).map((item) => item.name)
  );

  const [selectedHiddenId, setSelectedHiddenId] = useState<string | null>(() => {
    const defaults = allProducts.slice(INITIAL_VISIBLE_COUNT);
    return defaults[0]?.name ?? null;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<string | null>(null);
  const [modalTransactions, setModalTransactions] = useState<ProductTransactionItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const availableYears = useMemo(() => getAvailableYears(), []);

  const fetchProducts = async (from: string, to: string, isCompare = false) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/products?from=${from}&to=${to}`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        if (isCompare) {
          setCompareProducts(data.products);
        } else {
          setProducts(data.products);
        }
        setError(null);
      } catch (err) {
        setError("Не удалось загрузить данные");
        console.error(err);
      }
    });
  };

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    const { from, to } = getMonthRange(year, month);
    fetchProducts(from, to);
  };

  const handleCompareMonthChange = (year: number, month: number) => {
    setCompareYear(year);
    setCompareMonth(month);
    const { from, to } = getMonthRange(year, month);
    fetchProducts(from, to, true);
  };

  const toggleCompareMode = () => {
    if (!compareMode) {
      const { from, to } = getMonthRange(compareYear, compareMonth);
      fetchProducts(from, to, true);
    } else {
      setCompareProducts([]);
    }
    setCompareMode(!compareMode);
  };

  useEffect(() => {
    const { from, to } = getMonthRange(selectedYear, selectedMonth);
    fetchProducts(from, to);
  }, []);

  const handleOpenModal = async (productName: string) => {
    setModalProduct(productName);
    setModalOpen(true);
    setModalLoading(true);
    setModalTransactions([]);

    try {
      const { from, to } = getMonthRange(selectedYear, selectedMonth);
      const response = await fetch(`/api/dashboard/product-transactions?name=${encodeURIComponent(productName)}&from=${from}&to=${to}`);
      if (response.ok) {
        const data = await response.json();
        setModalTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to load product transactions:", err);
    } finally {
      setModalLoading(false);
    }
  };

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

  const handleToggleVisibility = (productName: string) => {
    const newVisible = visibleIds.includes(productName)
      ? visibleIds.filter((id) => id !== productName)
      : [...visibleIds, productName];
    setVisibleIds(newVisible);
    savePreferences(newVisible);
  };

  const handleAddHidden = () => {
    if (!selectedHiddenId) return;
    const newVisible = [...visibleIds, selectedHiddenId];
    setVisibleIds(newVisible);
    savePreferences(newVisible);
    const remaining = products.filter((p) => !newVisible.includes(p.name));
    setSelectedHiddenId(remaining[0]?.name ?? null);
  };

  const visibleProductsList = useMemo(
    () => products.filter((p) => visibleIds.includes(p.name)),
    [products, visibleIds]
  );

  const hiddenProducts = useMemo(
    () => products.filter((p) => !visibleIds.includes(p.name)),
    [products, visibleIds]
  );

  const periodLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Управление товарами
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={String(selectedYear)} onValueChange={(v) => handleMonthChange(Number(v), selectedMonth)} disabled={isPending}>
                <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedMonth)} onValueChange={(v) => handleMonthChange(selectedYear, Number(v))} disabled={isPending}>
                <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant={compareMode ? "default" : "outline"} size="sm" className="h-8" onClick={toggleCompareMode} disabled={isPending}>
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {compareMode && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <span className="text-xs text-muted-foreground">Сравнить с:</span>
              <Select value={String(compareYear)} onValueChange={(v) => handleCompareMonthChange(Number(v), compareMonth)} disabled={isPending}>
                <SelectTrigger className="w-[80px] h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(compareMonth)} onValueChange={(v) => handleCompareMonthChange(compareYear, Number(v))} disabled={isPending}>
                <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}

          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Нет данных по товарам за {periodLabel}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {visibleProductsList.map((product) => {
                  const compareProduct = compareProducts.find((p) => p.name === product.name);
                  const diff = compareProduct ? product.totalAmount - compareProduct.totalAmount : null;
                  return (
                    <div 
                      key={product.name} 
                      className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenModal(product.name)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <ShoppingBasket className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.quantity} {product.unit} • {product.transactionCount} покупок
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatMoney(Math.round(product.totalAmount * 100), currency)}</div>
                        {compareMode && diff !== null && (
                          <div className={`text-xs ${diff > 0 ? "text-red-500" : diff < 0 ? "text-green-500" : "text-muted-foreground"}`}>
                            {diff > 0 ? "+" : ""}{formatMoney(Math.round(diff * 100), currency)}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleToggleVisibility(product.name); }} title="Скрыть товар">
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBasket className="h-5 w-5" />
              {modalProduct}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">Транзакции за {periodLabel}</div>
          {modalLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : modalTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Нет транзакций</div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {modalTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <div className="text-sm font-medium">{new Date(tx.date).toLocaleDateString("ru-RU")}</div>
                    <div className="text-xs text-muted-foreground">{tx.quantity} {tx.unit}{tx.note ? ` • ${tx.note}` : ""}</div>
                  </div>
                  <div className="text-sm font-medium">{formatMoney(Math.round(tx.amount * 100), currency)}</div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
