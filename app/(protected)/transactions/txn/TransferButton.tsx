"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import modal from "@/components/transactions/AddModal.module.css";
import stylesTxn from "@/components/transactions/Transactions.module.css";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/components/toast/ToastContext";
import {
  transferFormSchema,
  type TransferFormValues,
} from "@/lib/validation/transaction";
import { createTransferFromValues } from "../actions";

type Account = { id: string; name: string; currency: string; type: string; credit_limit: number | null; balance: number };

type TransferButtonProps = {
  accounts: Account[];
};

function getDefaultAccounts(accounts: Account[]): { fromId: string; toId: string } {
  if (accounts.length === 0) return { fromId: "", toId: "" };
  if (accounts.length === 1) return { fromId: accounts[0]!.id, toId: accounts[0]!.id };
  return { fromId: accounts[0]!.id, toId: accounts[1]!.id };
}

export default function TransferButton({ accounts }: TransferButtonProps) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { show: showToast } = useToast();

  const primaryCurrency = accounts[0]?.currency || "RUB";
  const nowLocal = useMemo(
    () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    []
  );

  const defaultValues = useMemo<TransferFormValues>(() => {
    const { fromId, toId } = getDefaultAccounts(accounts);
    return {
      from_account_id: fromId,
      to_account_id: toId,
      amount_major: "",
      currency: primaryCurrency,
      occurred_at: nowLocal,
      note: "",
    };
  }, [accounts, nowLocal, primaryCurrency]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues,
    mode: "onSubmit",
  });

  const fromAccount = watch("from_account_id");

  // Группируем счета по типам (исключаем кредиты из переводов)
  const groupedAccounts = useMemo(() => {
    const debitCards: Account[] = [];
    const creditCards: Account[] = [];
    const other: Account[] = [];

    accounts.forEach((acc) => {
      // Кредиты (type='loan') не включаем в переводы
      // Погашение кредита делается через обычную транзакцию расхода
      if (acc.type === 'loan') {
        return; // Пропускаем кредиты
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

    return { debitCards, creditCards, other };
  }, [accounts]);

  useEffect(() => {
    if (!open) return;
    const { fromId, toId } = getDefaultAccounts(accounts);
    reset({
      from_account_id: fromId,
      to_account_id: toId,
      amount_major: "",
      currency: primaryCurrency,
      occurred_at: nowLocal,
      note: "",
    });
    setServerError(null);
  }, [open, accounts, nowLocal, primaryCurrency, reset]);

  useEffect(() => {
    if (!open) return;
    const source = accounts.find((a) => a.id === fromAccount);
    if (source) {
      setValue("currency", source.currency, { shouldDirty: true });
    }
  }, [open, accounts, fromAccount, setValue]);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      if (values.from_account_id === values.to_account_id) {
        setServerError("Выберите разные счета");
        return;
      }

      const normalized: TransferFormValues = {
        ...values,
        amount_major: values.amount_major.replace(/\s+/g, "").replace(",", "."),
      };

      const result = await createTransferFromValues(normalized);
      if (!result.ok) {
        setServerError(result.error ?? "Не удалось выполнить перевод");
        showToast(`❌ Ошибка: ${result.error ?? "Не удалось выполнить перевод"}`, { type: "error" });
        return;
      }
      showToast("✅ Перевод успешно выполнен", { type: "success" });
      setOpen(false);
    });
  });

  return (
    <>
      <button type="button" className={stylesTxn.topBtn} onClick={() => setOpen(true)}>
        <span className="material-icons" aria-hidden>
          swap_horiz
        </span>
        Перевод
      </button>

      {open && (
        <div className={modal.overlay} onClick={() => setOpen(false)}>
          <div className={modal.modal} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className={modal.header}>
              <div className={modal.title}>Перевод между счетами</div>
              <button type="button" className={modal.close} onClick={() => setOpen(false)} aria-label="Закрыть">
                <span className="material-icons" aria-hidden>
                  close
                </span>
              </button>
            </div>

            <form onSubmit={onSubmit} className={modal.body}>
              <div className={modal.row2}>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Со счета</label>
                  <select
                    {...register("from_account_id")}
                    className={stylesTxn.select}
                    defaultValue={defaultValues.from_account_id}
                    required
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
                  {errors.from_account_id && <div className={modal.error}>{errors.from_account_id.message}</div>}
                </div>
                <div className={modal.groupRow}>
                  <label className={modal.label}>На счет</label>
                  <select
                    {...register("to_account_id")}
                    className={stylesTxn.select}
                    defaultValue={defaultValues.to_account_id}
                    required
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
                  {errors.to_account_id && <div className={modal.error}>{errors.to_account_id.message}</div>}
                </div>
              </div>

              <div className={modal.row2}>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Сумма</label>
                  <input
                    {...register("amount_major")}
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className={stylesTxn.input}
                    required
                  />
                  {errors.amount_major && <div className={modal.error}>{errors.amount_major.message}</div>}
                </div>
                <div className={modal.groupRow}>
                  <label className={modal.label}>Дата</label>
                  <input
                    {...register("occurred_at")}
                    type="datetime-local"
                    className={stylesTxn.input}
                    defaultValue={defaultValues.occurred_at}
                    required
                  />
                  {errors.occurred_at && <div className={modal.error}>{errors.occurred_at.message}</div>}
                </div>
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

              <input type="hidden" {...register("currency")} value={primaryCurrency} />

              <div className={modal.footer}>
                <button
                  type="button"
                  className={stylesTxn.primaryBtn}
                  style={{ background: "#9e9e9e" }}
                  onClick={() => setOpen(false)}
                >
                  Отмена
                </button>
                <button type="submit" className={stylesTxn.primaryBtn} disabled={isPending}>
                  {isPending ? "Выполняем…" : "Перевести"}
                </button>
              </div>

              {serverError && <div className={modal.error}>{serverError}</div>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
