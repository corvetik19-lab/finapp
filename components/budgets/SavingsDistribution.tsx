"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils/format";
import styles from "./SavingsDistribution.module.css";

type DebitCard = {
  id: string;
  name: string;
  balance: number;
};

type Distribution = {
  accountId: string;
  amount: number;
};

type Props = {
  totalSavings: number;
  debitCards: DebitCard[];
  initialDistributions?: Array<{ account_id: string; amount: number }>;
};

export default function SavingsDistribution({ totalSavings, debitCards, initialDistributions = [] }: Props) {
  const [distributions, setDistributions] = useState<Distribution[]>(() => {
    // Загружаем сохраненные распределения или инициализируем нулями
    return debitCards.map(card => {
      const saved = initialDistributions.find(d => d.account_id === card.id);
      return { accountId: card.id, amount: saved?.amount || 0 };
    });
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
  const remaining = totalSavings - totalDistributed;

  const handleAmountChange = (accountId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setDistributions(prev =>
      prev.map(d => (d.accountId === accountId ? { ...d, amount: Math.round(amount * 100) } : d))
    );
  };

  const handleDistributeEqually = () => {
    const perCard = Math.floor(totalSavings / debitCards.length);
    setDistributions(debitCards.map(card => ({ accountId: card.id, amount: perCard })));
  };

  const handleClear = () => {
    setDistributions(debitCards.map(card => ({ accountId: card.id, amount: 0 })));
  };

  const handleDelete = async () => {
    if (!confirm('Удалить сохраненный план распределения?')) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Удаляем все распределения (отправляем пустой массив)
      const response = await fetch("/api/savings-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributions: [],
          totalAmount: 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при удалении");
      }

      // Очищаем локальное состояние
      handleClear();
      setSaveMessage("✅ План удален!");
      setTimeout(() => {
        setSaveMessage(null);
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error deleting distribution:", error);
      setSaveMessage("❌ Ошибка при удалении");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (totalDistributed === 0) {
      setSaveMessage("⚠️ Введите суммы для распределения");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (totalDistributed > totalSavings) {
      setSaveMessage("⚠️ Распределено больше чем запланировано!");
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Создаем транзакции для каждого распределения
      const response = await fetch("/api/savings-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributions: distributions.filter(d => d.amount > 0),
          totalAmount: totalDistributed,
        }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при сохранении");
      }

      setSaveMessage("✅ Распределение сохранено!");
      setTimeout(() => {
        setSaveMessage(null);
        window.location.reload(); // Перезагружаем страницу чтобы обновить данные
      }, 2000);
    } catch (error) {
      console.error("Error saving distribution:", error);
      setSaveMessage("❌ Ошибка при сохранении");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>💰 Распределение экономии</h2>
          <p className={styles.subtitle}>
            Планируемая экономия: <strong>{formatMoney(totalSavings, "RUB")}</strong>
          </p>
        </div>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="material-icons">
            {isExpanded ? "expand_less" : "expand_more"}
          </span>
          {isExpanded ? "Свернуть" : "Развернуть"}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.content}>
          {/* Показываем сохраненный план если есть */}
          {totalDistributed > 0 && (
            <div className={styles.savedPlan}>
              <div className={styles.savedPlanHeader}>
                <div className={styles.savedPlanHeaderLeft}>
                  <span className="material-icons">bookmark</span>
                  <span>Сохраненный план распределения</span>
                </div>
                <div className={styles.savedPlanHeaderActions}>
                  <button
                    type="button"
                    className={styles.savedPlanActionBtn}
                    onClick={() => {
                      // Редактирование - просто скроллим вниз к форме
                      document.querySelector(`.${styles.cards}`)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    title="Редактировать"
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button
                    type="button"
                    className={styles.savedPlanActionBtn}
                    onClick={handleDelete}
                    disabled={isSaving}
                    title="Удалить"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              </div>
              <div className={styles.savedPlanCards}>
                {distributions.filter(d => d.amount > 0).map(dist => {
                  const card = debitCards.find(c => c.id === dist.accountId);
                  if (!card) return null;
                  const percentage = totalSavings > 0 ? (dist.amount / totalSavings) * 100 : 0;
                  return (
                    <div key={dist.accountId} className={styles.savedPlanCard}>
                      <div className={styles.savedPlanCardIcon}>💳</div>
                      <div className={styles.savedPlanCardInfo}>
                        <div className={styles.savedPlanCardName}>{card.name}</div>
                        <div className={styles.savedPlanCardAmount}>
                          {formatMoney(dist.amount, "RUB")}
                        </div>
                      </div>
                      <div className={styles.savedPlanCardPercent}>
                        {percentage.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleDistributeEqually}
            >
              <span className="material-icons">balance</span>
              Распределить поровну
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={handleClear}
            >
              <span className="material-icons">clear_all</span>
              Очистить
            </button>
          </div>

          <div className={styles.cards}>
            {debitCards.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6b7280',
                gridColumn: '1 / -1'
              }}>
                Нет дебетовых карт для распределения экономии. 
                <br />
                Добавьте дебетовые карты в разделе &quot;Карты&quot;.
              </div>
            ) : (
              debitCards.map((card) => {
              const distribution = distributions.find(d => d.accountId === card.id);
              const amount = distribution?.amount || 0;
              const percentage = totalSavings > 0 ? (amount / totalSavings) * 100 : 0;

              return (
                <div key={card.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <div className={styles.cardName}>💳 {card.name}</div>
                      <div className={styles.cardBalance}>
                        Текущий баланс: {formatMoney(card.balance, "RUB")}
                      </div>
                    </div>
                    <div className={styles.percentage}>
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className={styles.cardInput}>
                    <label>
                      <span className={styles.label}>Сумма для распределения (₽)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={styles.input}
                        value={amount / 100}
                        onChange={(e) => handleAmountChange(card.id, e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                  {amount > 0 && (
                    <div className={styles.cardResult}>
                      Новый баланс: <strong>{formatMoney(card.balance + amount, "RUB")}</strong>
                    </div>
                  )}
                </div>
              );
            })
            )}
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Всего для распределения:</span>
              <strong>{formatMoney(totalSavings, "RUB")}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Распределено:</span>
              <strong className={totalDistributed > totalSavings ? styles.error : ""}>
                {formatMoney(totalDistributed, "RUB")}
              </strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Осталось:</span>
              <strong className={remaining < 0 ? styles.error : styles.success}>
                {formatMoney(remaining, "RUB")}
              </strong>
            </div>
            {totalDistributed > totalSavings && (
              <div className={styles.warning}>
                ⚠️ Распределено больше чем запланировано!
              </div>
            )}
          </div>

          {saveMessage && (
            <div className={styles.saveMessage}>
              {saveMessage}
            </div>
          )}

          <div className={styles.saveButtonContainer}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving || totalDistributed === 0}
            >
              {isSaving ? (
                <>
                  <span className="material-icons">hourglass_empty</span>
                  Сохранение...
                </>
              ) : (
                <>
                  <span className="material-icons">save</span>
                  Сохранить распределение
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
