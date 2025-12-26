"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getQuickPresets } from "@/lib/quick-presets/service";
import { createTransactionFromValues } from "@/app/(protected)/finance/transactions/actions";
import type { QuickTransactionPreset } from "@/types/quick-preset";
import type { TransactionFormValues } from "@/lib/validation/transaction";
import { useToast } from "@/components/toast/ToastContext";
import AmountInputWithCalculator from "@/components/calculator/AmountInputWithCalculator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Loader2 } from "lucide-react";

type Account = {
  id: string;
  name: string;
  currency: string;
};

export default function QuickTransactionButton({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<QuickTransactionPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<QuickTransactionPreset | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const router = useRouter();
  const { show: showToast } = useToast();

  const loadPresets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getQuickPresets();
      setPresets(data);
    } catch (error) {
      console.error("Error loading presets:", error);
      showToast("Ошибка загрузки пресетов", { type: "error" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (open) {
      loadPresets();
    }
  }, [open, loadPresets]);

  async function handlePresetClick(preset: QuickTransactionPreset) {
    // Если сумма не указана (0 или null), показываем форму для ввода
    if (!preset.amount || preset.amount === 0) {
      setSelectedPreset(preset);
      setCustomAmount("");
      return;
    }

    // Если сумма есть - создаём транзакцию сразу
    await createTransaction(preset, preset.amount);
  }

  async function createTransaction(preset: QuickTransactionPreset, amountMinor: number) {
    try {
      const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      // Определяем счёт: используем указанный в пресете или первый доступный
      const accountId = preset.account_id || accounts[0]?.id || "";
      const account = accounts.find(a => a.id === accountId);
      
      if (!accountId) {
        showToast("Нет доступных счетов", { type: "error" });
        return;
      }

      const values: TransactionFormValues = {
        direction: preset.direction,
        account_id: accountId,
        category_id: preset.category_id || "",
        amount_major: (amountMinor / 100).toFixed(2),
        currency: account?.currency || "RUB",
        occurred_at: nowLocal,
        note: preset.name,
        counterparty: preset.name,
      };

      // Создаём позицию товара с названием из пресета
      const items = [{
        name: preset.name,
        quantity: 1,
        unit: "шт",
        price_per_unit: amountMinor,
        category_id: preset.category_id || null,
        product_id: null,
      }];

      const result = await createTransactionFromValues(values, items);
      
      if (result.ok) {
        showToast(`✅ ${preset.name} добавлена`, { type: "success" });
        setOpen(false);
        setSelectedPreset(null);
        setCustomAmount("");
        // Используем только refresh без push чтобы избежать множественных запросов
        router.refresh();
      } else {
        showToast(`❌ ${result.error}`, { type: "error" });
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      showToast("Ошибка создания транзакции", { type: "error" });
    }
  }

  function handleCustomAmountSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPreset || !customAmount) return;
    
    const amountMinor = Math.round(parseFloat(customAmount) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      showToast("Введите корректную сумму", { type: "error" });
      return;
    }

    createTransaction(selectedPreset, amountMinor);
  }

  const incomePresets = presets.filter(p => p.direction === "income");
  const expensePresets = presets.filter(p => p.direction === "expense");

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Zap className="h-4 w-4 mr-1" />
        Быстрое
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Быстрое добавление
            </DialogTitle>
          </DialogHeader>

          {selectedPreset ? (
            <form onSubmit={handleCustomAmountSubmit} className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg">{selectedPreset.name}</h3>
                <p className="text-sm text-muted-foreground">Введите сумму для этой транзакции:</p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <AmountInputWithCalculator value={customAmount} onChange={(value) => setCustomAmount(value)} placeholder="0.00" className="w-48 text-xl text-center font-semibold" />
                <span className="text-xl font-semibold text-muted-foreground">₽</span>
              </div>
              <div className="flex justify-center gap-2">
                <Button type="button" variant="outline" onClick={() => { setSelectedPreset(null); setCustomAmount(""); }}>Отмена</Button>
                <Button type="submit" disabled={!customAmount || parseFloat(customAmount) <= 0}>Добавить</Button>
              </div>
            </form>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : presets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Нет настроенных быстрых пресетов</p>
              <p className="text-sm">Добавьте пресеты в настройках для быстрого создания транзакций</p>
            </div>
          ) : (
            <div className="space-y-6">
              {incomePresets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="p-1 rounded-full bg-green-100 dark:bg-green-900/30">💰</span>
                    Доходы
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {incomePresets.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => handlePresetClick(preset)}
                        className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-card border border-green-200/50 dark:border-green-800/30 hover:shadow-md hover:shadow-green-200/50 dark:hover:shadow-green-900/30 transition-all text-left group">
                        <div className="font-medium text-sm truncate group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">{preset.name}</div>
                        <div className="text-green-600 dark:text-green-400 font-bold">
                          {preset.amount && preset.amount > 0 ? `+${(preset.amount / 100).toFixed(2)} ₽` : "Ввести сумму"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {expensePresets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="p-1 rounded-full bg-red-100 dark:bg-red-900/30">💸</span>
                    Расходы
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {expensePresets.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => handlePresetClick(preset)}
                        className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-card border border-red-200/50 dark:border-red-800/30 hover:shadow-md hover:shadow-red-200/50 dark:hover:shadow-red-900/30 transition-all text-left group">
                        <div className="font-medium text-sm truncate group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">{preset.name}</div>
                        <div className="text-red-600 dark:text-red-400 font-bold">
                          {preset.amount && preset.amount > 0 ? `−${(preset.amount / 100).toFixed(2)} ₽` : "Ввести сумму"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
