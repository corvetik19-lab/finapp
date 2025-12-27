"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/validation/transaction";
import { createTransactionFromValues } from "../actions";
import { TransactionItems } from "@/components/transactions/TransactionItems";
import type { TransactionItemInput } from "@/types/transaction";
import { calculateTotalFromItems } from "@/lib/transactions/transaction-items-utils";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast/ToastContext";

type Account = { id: string; name: string; currency: string; type: string; credit_limit: number | null; balance: number };

export default function AddTransactionButton({
  accounts,
}: {
  accounts: Account[];
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('addTransactionModalOpen');
      return saved === 'true';
    }
    return false;
  });
  const router = useRouter();
  const toast = useToast();
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const prevOpenRef = useRef(false);
  const [transactionItems, setTransactionItems] = useState<TransactionItemInput[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('addTransactionItems');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const primaryCurrency = accounts[0]?.currency || "RUB";

  const defaultValues = useMemo<TransactionFormValues>(
    () => ({
      direction: "expense",
      account_id: accounts[0]?.id ?? "",
      category_id: "",
      amount_major: "",
      currency: primaryCurrency,
      occurred_at: nowLocal,
      note: "",
      counterparty: "",
    }),
    [accounts, primaryCurrency, nowLocal]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    watch,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
    mode: "onSubmit",
  });

  useEffect(() => {
    // Сохраняем состояние открытия модалки
    localStorage.setItem('addTransactionModalOpen', String(open));
  }, [open]);

  useEffect(() => {
    // Сохраняем позиции товаров
    localStorage.setItem('addTransactionItems', JSON.stringify(transactionItems));
  }, [transactionItems]);

  useEffect(() => {
    // Восстанавливаем форму из localStorage при монтировании
    if (open && typeof window !== 'undefined') {
      const savedForm = localStorage.getItem('addTransactionForm');
      if (savedForm) {
        try {
          const formData = JSON.parse(savedForm);
          Object.keys(formData).forEach((key) => {
            setValue(key as keyof TransactionFormValues, formData[key]);
          });
        } catch {
          // Игнорируем ошибки парсинга
        }
      }
    }

    // Сбрасываем форму только при переходе false -> true (открытие модалки)
    if (open && !prevOpenRef.current) {
      const savedForm = localStorage.getItem('addTransactionForm');
      if (!savedForm) {
        reset(defaultValues);
        setServerError(null);
        setValue("direction", "expense");
        setValue("currency", primaryCurrency);
        setValue("account_id", accounts[0]?.id ?? "");
      }
    }
    prevOpenRef.current = open;
  }, [open, reset, defaultValues, setValue, primaryCurrency, accounts]);

  const amountValue = watch("amount_major");
  const accountValue = watch("account_id");
  const directionValue = useWatch({ control, name: "direction" }) ?? "expense";

  // Группируем счета по типам
  const groupedAccounts = useMemo(() => {
    const debitCards: Account[] = [];
    const creditCards: Account[] = [];
    const loans: Account[] = [];
    const other: Account[] = [];

    accounts.forEach((acc) => {
      if (acc.type === 'loan') {
        // Кредиты из таблицы loans
        loans.push(acc);
      } else if (acc.credit_limit && acc.credit_limit > 0) {
        // Кредитные карты
        creditCards.push(acc);
      } else if (acc.type === 'card') {
        // Дебетовые карты
        debitCards.push(acc);
      } else {
        // Остальное (наличные, депозиты и т.д.)
        other.push(acc);
      }
    });

    return { debitCards, creditCards, loans, other };
  }, [accounts]);

  // Определяем тип выбранного счёта
  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.id === accountValue);
  }, [accounts, accountValue]);

  const isCreditAccount = useMemo(() => {
    if (!selectedAccount) return false;
    // Кредитная карта или кредит
    return (selectedAccount.credit_limit && selectedAccount.credit_limit > 0) || selectedAccount.type === 'loan';
  }, [selectedAccount]);

  // При смене счёта на кредитный - принудительно ставим "расход"
  useEffect(() => {
    if (isCreditAccount && directionValue === 'income') {
      setValue('direction', 'expense');
    }
  }, [isCreditAccount, directionValue, setValue]);

  useEffect(() => {
    const current = accounts.find((a) => a.id === accountValue);
    if (current) {
      setValue("currency", current.currency);
    }
  }, [accountValue, accounts, setValue]);

  // Автоматически обновляем сумму транзакции при изменении позиций товаров
  useEffect(() => {
    if (transactionItems.length > 0) {
      const totalMinor = calculateTotalFromItems(transactionItems);
      const totalMajor = (totalMinor / 100).toFixed(2);
      setValue("amount_major", totalMajor);
    } else {
      // Если все товары удалены, очищаем сумму
      setValue("amount_major", "");
    }
  }, [transactionItems, setValue]);

  // Сохраняем значения формы при изменении
  const formValues = watch();
  useEffect(() => {
    if (open) {
      localStorage.setItem('addTransactionForm', JSON.stringify(formValues));
    }
  }, [formValues, open]);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const normalized: TransactionFormValues = {
        ...values,
        category_id: values.category_id || "",
        amount_major: values.amount_major ? values.amount_major.replace(/\s+/g, "").replace(/,/g, ".") : "",
      };
      const result = await createTransactionFromValues(normalized, transactionItems);
      if (!result.ok) {
        setServerError(result.error ?? "Не удалось сохранить транзакцию");
        return;
      }
      reset(defaultValues);
      setTransactionItems([]);
      setOpen(false);
      // Очищаем localStorage после успешного сохранения
      localStorage.removeItem('addTransactionModalOpen');
      localStorage.removeItem('addTransactionForm');
      localStorage.removeItem('addTransactionItems');
      toast.show("Транзакция создана", { type: "success" });
      router.refresh();
    });
  });

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-5 w-5" aria-hidden />
        Добавить
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div className="text-lg font-semibold">Добавить транзакцию</div>
              <button type="button" className="p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => {
                setOpen(false);
                localStorage.removeItem('addTransactionModalOpen');
                localStorage.removeItem('addTransactionForm');
                localStorage.removeItem('addTransactionItems');
              }} aria-label="Закрыть">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-4 space-y-4">
              {/* Название (сохраняем в counterparty) */}
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input
                  {...register("counterparty")}
                  type="text"
                  placeholder="Например: Магнит"
                />
              </div>

              {/* Ряд 1: Тип */}
              <div className="space-y-1.5">
                <Label>Тип</Label>
                <select 
                  {...register("direction")} 
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                  defaultValue="expense"
                >
                  <option value="expense">Расход</option>
                  {!isCreditAccount && <option value="income">Доход</option>}
                </select>
                {isCreditAccount && (
                  <p className="text-xs text-muted-foreground">Для кредитных карт и кредитов доступны только расходы</p>
                )}
              </div>

              {/* Ряд 2: Счет/Карта + Сумма (₽) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Счет/Карта</Label>
                  <select
                    {...register("account_id")}
                    required
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    defaultValue={accounts[0]?.id || ""}
                  >
                    <option value="">— выберите —</option>
                    
                    {groupedAccounts.debitCards.length > 0 && (
                      <optgroup label="💳 Дебетовые карты">
                        {groupedAccounts.debitCards.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    
                    {groupedAccounts.creditCards.length > 0 && (
                      <optgroup label="💳 Кредитные карты">
                        {groupedAccounts.creditCards.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    
                    {groupedAccounts.loans.length > 0 && (
                      <optgroup label="🏦 Кредиты">
                        {groupedAccounts.loans.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    
                    {groupedAccounts.other.length > 0 && (
                      <optgroup label="💰 Другие счета">
                        {groupedAccounts.other.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Сумма (₽)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={amountValue}
                    onChange={(e) => setValue("amount_major", e.target.value)}
                    placeholder="0"
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                  {errors.amount_major?.message && (
                    <span className="text-sm text-destructive">{errors.amount_major.message}</span>
                  )}
                </div>
              </div>

              {/* Ряд 3: Дата + Примечание */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Дата</Label>
                  <Input
                    {...register("occurred_at")}
                    type="datetime-local"
                    defaultValue={nowLocal}
                  />
                  {errors.occurred_at && <div className="text-sm text-destructive">{errors.occurred_at.message}</div>}
                </div>
                <div className="space-y-1.5">
                  <Label>Примечание</Label>
                  <Input
                    {...register("note")}
                    type="text"
                    placeholder="Комментарий"
                  />
                </div>
              </div>

              {/* Позиции товаров */}
              <TransactionItems
                items={transactionItems}
                onChange={setTransactionItems}
                currency={primaryCurrency}
                direction={directionValue === "transfer" ? undefined : directionValue}
              />

              <input type="hidden" value={primaryCurrency} {...register("currency")} />

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="secondary" onClick={() => {
                  setOpen(false);
                  localStorage.removeItem('addTransactionModalOpen');
                  localStorage.removeItem('addTransactionForm');
                  localStorage.removeItem('addTransactionItems');
                }}>
                  Отмена
                </Button>
                <Button type="submit" disabled={isPending || !amountValue}>
                  {isPending ? "Сохраняем…" : "Добавить"}
                </Button>
              </div>

              {serverError && <div className="text-sm text-destructive mt-2">{serverError}</div>}
              {errors.account_id && <div className="text-sm text-destructive">{errors.account_id.message}</div>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
