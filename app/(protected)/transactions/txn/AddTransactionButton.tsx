"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
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

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; kind: "income" | "expense" | "transfer" };

export default function AddTransactionButton({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

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
    if (open) {
      reset(defaultValues);
      setServerError(null);
      setValue("direction", "expense");
      setValue("currency", primaryCurrency);
    }
  }, [open, reset, defaultValues, setValue, primaryCurrency]);

  useEffect(() => {
    if (!open) return;
    setValue("account_id", accounts[0]?.id ?? "");
    setValue("currency", accounts[0]?.currency ?? primaryCurrency);
  }, [open, setValue, accounts, primaryCurrency]);

  const amountValue = watch("amount_major");
  const accountValue = watch("account_id");
  const directionValue = useWatch({ control, name: "direction" }) ?? "expense";
  const categoryValue = useWatch({ control, name: "category_id" }) ?? "";

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === directionValue),
    [categories, directionValue]
  );

  useEffect(() => {
    const current = accounts.find((a) => a.id === accountValue);
    if (current) {
      setValue("currency", current.currency);
    }
  }, [accountValue, accounts, setValue]);

  useEffect(() => {
    if (!filteredCategories.find((c) => c.id === categoryValue)) {
      setValue("category_id", "");
    }
  }, [filteredCategories, categoryValue, setValue]);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const normalized: TransactionFormValues = {
        ...values,
        category_id: values.category_id || "",
        amount_major: values.amount_major ? values.amount_major.replace(/\s+/g, "").replace(/,/g, ".") : "",
      };
      const result = await createTransactionFromValues(normalized);
      if (!result.ok) {
        setServerError(result.error ?? "Не удалось сохранить транзакцию");
        return;
      }
      reset(defaultValues);
      setOpen(false);
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
              <button type="button" className={modal.close} onClick={() => setOpen(false)} aria-label="Закрыть">
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

              {/* Ряд 1: Тип + Категория */}
              <div className={modal.row2}>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Тип</label>
                  <select {...register("direction")} className={stylesTxn.select} defaultValue="expense">
                    <option value="expense">Расход</option>
                    <option value="income">Доход</option>
                  </select>
                </div>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Категория</label>
                  <select {...register("category_id")} className={stylesTxn.select} defaultValue="">
                    <option value="">— не выбрана —</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Сумма (₽)</label>
                  <input
                    {...register("amount_major")}
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className={stylesTxn.input}
                    autoFocus
                  />
                  {errors.amount_major && <div className={modal.error}>{errors.amount_major.message}</div>}
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

              <input type="hidden" value={primaryCurrency} {...register("currency")} />

              {/* Footer */}
              <div className={modal.footer}>
                <button type="button" className={stylesTxn.primaryBtn} onClick={() => setOpen(false)} style={{ background: "#9e9e9e" }}>
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
