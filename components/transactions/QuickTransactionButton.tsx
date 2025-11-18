"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getQuickPresets } from "@/lib/quick-presets/service";
import { createTransactionFromValues } from "@/app/(protected)/finance/transactions/actions";
import type { QuickTransactionPreset } from "@/types/quick-preset";
import type { TransactionFormValues } from "@/lib/validation/transaction";
import styles from "./QuickTransactionButton.module.css";
import { useToast } from "@/components/toast/ToastContext";
import AmountInputWithCalculator from "@/components/calculator/AmountInputWithCalculator";

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

  useEffect(() => {
    if (open) {
      loadPresets();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadPresets() {
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
  }

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
      <button 
        type="button" 
        className={styles.quickBtn}
        onClick={() => setOpen(true)}
        title="Быстрое добавление"
      >
        <span className="material-icons">bolt</span>
        Быстрое
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h2 className={styles.title}>Быстрое добавление</h2>
              <button 
                type="button" 
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className={styles.body}>
              {selectedPreset ? (
                <form className={styles.amountForm} onSubmit={handleCustomAmountSubmit}>
                  <h3 className={styles.formTitle}>{selectedPreset.name}</h3>
                  <p className={styles.formHint}>Введите сумму для этой транзакции:</p>
                  <div className={styles.inputGroup}>
                    <AmountInputWithCalculator
                      value={customAmount}
                      onChange={(value) => setCustomAmount(value)}
                      placeholder="0.00"
                      className={styles.amountInput}
                    />
                    <span className={styles.currency}>₽</span>
                  </div>
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => {
                        setSelectedPreset(null);
                        setCustomAmount("");
                      }}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={!customAmount || parseFloat(customAmount) <= 0}
                    >
                      Добавить
                    </button>
                  </div>
                </form>
              ) : loading ? (
                <div className={styles.loading}>Загрузка...</div>
              ) : presets.length === 0 ? (
                <div className={styles.empty}>
                  <span className="material-icons" style={{ fontSize: 48, color: "#ccc" }}>
                    bolt_off
                  </span>
                  <p>Нет настроенных быстрых пресетов</p>
                  <p className={styles.hint}>
                    Добавьте пресеты в настройках для быстрого создания транзакций
                  </p>
                </div>
              ) : (
                <>
                  {incomePresets.length > 0 && (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>
                        <span className={styles.incomeIcon}>💰</span>
                        Доходы
                      </h3>
                      <div className={styles.grid}>
                        {incomePresets.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            className={`${styles.presetCard} ${styles.income}`}
                            onClick={() => handlePresetClick(preset)}
                          >
                            <div className={styles.presetName}>{preset.name}</div>
                            <div className={styles.presetAmount}>
                              {preset.amount && preset.amount > 0 
                                ? `+${(preset.amount / 100).toFixed(2)} ₽`
                                : "Ввести сумму"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {expensePresets.length > 0 && (
                    <div className={styles.section}>
                      <h3 className={styles.sectionTitle}>
                        <span className={styles.expenseIcon}>💸</span>
                        Расходы
                      </h3>
                      <div className={styles.grid}>
                        {expensePresets.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            className={`${styles.presetCard} ${styles.expense}`}
                            onClick={() => handlePresetClick(preset)}
                          >
                            <div className={styles.presetName}>{preset.name}</div>
                            <div className={styles.presetAmount}>
                              {preset.amount && preset.amount > 0 
                                ? `−${(preset.amount / 100).toFixed(2)} ₽`
                                : "Ввести сумму"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
