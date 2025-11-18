"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import stylesTxn from "@/components/transactions/Transactions.module.css";
import modal from "@/components/transactions/AddModal.module.css";
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

  // Группируем счета по типам (исключаем кредитные карты - они только для переводов)
  const groupedAccounts = useMemo(() => {
    const debitCards: Account[] = [];
    const loans: Account[] = [];
    const other: Account[] = [];

    accounts.forEach((acc) => {
      if (acc.type === 'loan') {
        // Кредиты из таблицы loans
        loans.push(acc);
      } else if (acc.credit_limit && acc.credit_limit > 0) {
        // Кредитные карты - пропускаем, они только для переводов
        return;
      } else if (acc.type === 'card') {
        // Дебетовые карты
        debitCards.push(acc);
      } else {
        // Остальное (наличные, депозиты и т.д.)
        other.push(acc);
      }
    });

    return { debitCards, loans, other };
  }, [accounts]);

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
      router.refresh();
    });
  });

  return (
    <>
      <button type="button" className={stylesTxn.topBtn} onClick={() => setOpen(true)}>
        <span className="material-icons" aria-hidden>
          add
        </span>
        Добавить
      </button>

      {open && (
        <div className={modal.overlay} onClick={() => setOpen(false)}>
          <div className={modal.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={modal.header}>
              <div className={modal.title}>Добавить транзакцию</div>
              <button type="button" className={modal.close} onClick={() => {
                setOpen(false);
                // Очищаем localStorage при закрытии
                localStorage.removeItem('addTransactionModalOpen');
                localStorage.removeItem('addTransactionForm');
                localStorage.removeItem('addTransactionItems');
              }} aria-label="Закрыть">
                <span className="material-icons" aria-hidden>
                  close
                </span>
              </button>
            </div>

            <form onSubmit={onSubmit} className={modal.body}>
              {/* Название (сохраняем в counterparty) */}
              <div className={modal.groupRow}>
                <label className={modal.label}>Название</label>
                <input
                  {...register("counterparty")}
                  type="text"
                  placeholder="Например: Магнит"
                  className={stylesTxn.input}
                />
              </div>

              {/* Ряд 1: Тип */}
              <div className={modal.groupRow}>
                <label className={modal.label}>Тип</label>
                <select {...register("direction")} className={stylesTxn.select} defaultValue="expense">
                  <option value="expense">Расход</option>
                  <option value="income">Доход</option>
                </select>
              </div>

              {/* Ряд 2: Счет/Карта + Сумма (₽) */}
              <div className={modal.row2}>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Счет/Карта</label>
                  <select
                    {...register("account_id")}
                    required
                    className={stylesTxn.select}
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
                <div className={modal.groupRow}>
                  <label className={modal.label}>Сумма (₽)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountValue}
                    onChange={(e) => setValue("amount_major", e.target.value)}
                    placeholder="0"
                    className={stylesTxn.input}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                  {errors.amount_major?.message && (
                    <span className={modal.error}>{errors.amount_major.message}</span>
                  )}
                </div>
              </div>

              {/* Ряд 3: Дата + Примечание */}
              <div className={modal.row2}>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Дата</label>
                  <input
                    {...register("occurred_at")}
                    type="datetime-local"
                    className={stylesTxn.input}
                    defaultValue={nowLocal}
                  />
                  {errors.occurred_at && <div className={modal.error}>{errors.occurred_at.message}</div>}
                </div>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Примечание</label>
                  <input
                    {...register("note")}
                    type="text"
                    placeholder="Комментарий"
                    className={stylesTxn.input}
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
              <div className={modal.footer}>
                <button type="button" className={stylesTxn.primaryBtn} onClick={() => {
                  setOpen(false);
                  // Очищаем localStorage при отмене
                  localStorage.removeItem('addTransactionModalOpen');
                  localStorage.removeItem('addTransactionForm');
                  localStorage.removeItem('addTransactionItems');
                }} style={{ background: "#9e9e9e" }}>
                  Отмена
                </button>
                <button
                  type="submit"
                  className={stylesTxn.primaryBtn}
                  disabled={isPending || !amountValue}
                >
                  {isPending ? "Сохраняем…" : "Добавить"}
                </button>
              </div>

              {serverError && <div className={modal.error}>{serverError}</div>}
              {errors.account_id && <div className={modal.error}>{errors.account_id.message}</div>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
