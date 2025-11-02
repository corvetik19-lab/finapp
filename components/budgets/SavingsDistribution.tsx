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
};

export default function SavingsDistribution({ totalSavings, debitCards }: Props) {
  const [distributions, setDistributions] = useState<Distribution[]>(
    debitCards.map(card => ({ accountId: card.id, amount: 0 }))
  );
  const [isExpanded, setIsExpanded] = useState(false);

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
        </div>
      )}
    </section>
  );
}
