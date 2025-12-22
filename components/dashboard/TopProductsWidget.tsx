"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, ShoppingBasket, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

type ProductItem = {
  name: string;
  quantity: number;
  unit: string;
  totalAmount: number;
  transactionCount: number;
};

type ProductTransactionItem = {
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
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
};

export type TopProductsWidgetProps = {
  currency: string;
};

export default function TopProductsWidget({ currency }: TopProductsWidgetProps) {
  const [isPending, startTransition] = useTransition();
  const now = new Date();

  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [prevProducts, setPrevProducts] = useState<ProductItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<string | null>(null);
  const [modalTransactions, setModalTransactions] = useState<ProductTransactionItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const availableYears = useMemo(() => getAvailableYears(), []);

  const fetchProducts = async (from: string, to: string, isPrev = false) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/products?from=${from}&to=${to}`);
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        if (isPrev) {
          setPrevProducts(data.products || []);
        } else {
          setProducts(data.products || []);
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

    // Загружаем предыдущий месяц для сравнения рейтинга
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevRange = getMonthRange(prevYear, prevMonth);
    fetchProducts(prevRange.from, prevRange.to, true);
  };

  useEffect(() => {
    const { from, to } = getMonthRange(selectedYear, selectedMonth);
    fetchProducts(from, to);
    
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const prevRange = getMonthRange(prevYear, prevMonth);
    fetchProducts(prevRange.from, prevRange.to, true);
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

  const top10 = products.slice(0, 10);
  const periodLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;

  const getRankChange = (productName: string, currentRank: number) => {
    const prevRank = prevProducts.findIndex((p) => p.name === productName);
    if (prevRank === -1) return { type: "new" as const, diff: 0 };
    const diff = prevRank - currentRank;
    if (diff > 0) return { type: "up" as const, diff };
    if (diff < 0) return { type: "down" as const, diff: Math.abs(diff) };
    return { type: "same" as const, diff: 0 };
  };

  const getRankIcon = (type: "up" | "down" | "same" | "new") => {
    switch (type) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      case "new":
        return <span className="text-xs text-blue-500 font-medium">NEW</span>;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Топ-10 покупок
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <div className="text-sm text-destructive mb-2">{error}</div>}
          
          {isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : top10.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Нет данных за {periodLabel}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {top10.map((product, idx) => {
                const rankChange = getRankChange(product.name, idx);
                return (
                  <div
                    key={product.name}
                    className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenModal(product.name)}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm ${
                      idx === 0 ? "bg-yellow-100 text-yellow-700" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {product.quantity} {product.unit} • {product.transactionCount} покупок
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatMoney(Math.round(product.totalAmount * 100), currency)}</div>
                      </div>
                      <div className="w-6 flex items-center justify-center">
                        {getRankIcon(rankChange.type)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 text-xs text-muted-foreground text-center">
                {periodLabel} • Сравнение с предыдущим месяцем
              </div>
            </div>
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
