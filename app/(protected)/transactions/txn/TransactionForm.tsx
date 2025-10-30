"use client";
import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTransactionAction, type TxnActionState } from "../actions";
import { useRouter } from "next/navigation";
import stylesTxn from "@/components/transactions/Transactions.module.css";

export default function TransactionForm({
  accounts,
  categories,
}: {
  accounts: { id: string; name: string; currency: string; type: string; credit_limit: number | null; balance: number }[];
  categories: { id: string; name: string; kind: "income" | "expense" | "transfer" }[];
}) {
  const initial: TxnActionState = { ok: false };
  const [state, formAction] = useActionState(createTransactionAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const router = useRouter();
  const [direction, setDirection] = useState<"expense" | "income">("expense");

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDirection("expense");
      router.refresh();
    }
  }, [state.ok, router]);

  useEffect(() => {
    if (categoryRef.current) {
      categoryRef.current.value = "";
    }
  }, [direction]);

  const options = useMemo(
    () => categories.filter((c) => c.kind === direction),
    [categories, direction]
  );

  // Группируем счета по типам (исключаем кредитные карты - они только для переводов)
  const groupedAccounts = useMemo(() => {
    const debitCards: typeof accounts = [];
    const loans: typeof accounts = [];
    const other: typeof accounts = [];

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

  return (
    <form ref={formRef} action={formAction} style={{ display: "grid", gap: 8, background: "#fff", padding: 12, borderRadius: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label>
          <span>Тип</span>
          <select
            name="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "expense" | "income")}
            required
            style={{ display: "block", padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          >
            <option value="expense">Расход</option>
            <option value="income">Доход</option>
          </select>
        </label>

        <label>
          <span>Счёт</span>
          <select name="account_id" defaultValue={accounts[0]?.id || ""} required style={{ display: "block", padding: 8, borderRadius: 8, border: "1px solid #ccc", minWidth: 200 }}>
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
        </label>

        <label>
          <span>Категория</span>
          <select
            ref={categoryRef}
            name="category_id"
            style={{ display: "block", padding: 8, borderRadius: 8, border: "1px solid #ccc", minWidth: 200 }}
          >
            <option value="">— не выбрана —</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Сумма</span>
          <input
            name="amount_major"
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0"
            required
            style={{ display: "block", padding: 8, borderRadius: 8, border: "1px solid #ccc", width: 140 }}
          />
        </label>

        <label>
          <span>Дата</span>
          <input name="occurred_at" type="datetime-local" style={{ display: "block", padding: 8, borderRadius: 8, border: "1px solid #ccc" }} />
        </label>

        <label style={{ flex: 1 }}>
          <span>Заметка</span>
          <input name="note" type="text" placeholder="Комментарий" style={{ display: "block", padding: 8, borderRadius: 8, border: "1px solid #ccc", width: "100%" }} />
        </label>
      </div>

      <input type="hidden" name="currency" value={accounts[0]?.currency || "RUB"} />

      <div aria-live="polite" style={{ minHeight: 20, color: state.error ? "#c62828" : "#2e7d32" }}>
        {state.error ? state.error : state.ok ? "Сохранено" : null}
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={stylesTxn.primaryBtn}>
      {pending ? "Сохраняем…" : "Добавить"}
    </button>
  );
}
