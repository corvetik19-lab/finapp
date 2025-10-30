"use client";

import { useState } from "react";
import styles from "./CreditCardsList.module.css";
import { formatMoney } from "@/lib/utils/format";

export type CreditCard = {
  id: string;
  bank: string;
  balance: number; // доступный остаток в минорных единицах
  limit: number;
  available: number;
  debt?: number; // задолженность в минорных единицах
  currency: string;
  interestRate: number;
  gracePeriod: number;
  nextPaymentDate: string | null;
  minPayment: number;
  cardNumberLast4: string | null;
};

type CreditCardsListProps = {
  cards: CreditCard[];
  onEdit?: (card: CreditCard) => void;
  onDelete?: (cardId: string) => void;
  onCardClick?: (card: CreditCard) => void;
};

export default function CreditCardsList({ cards, onEdit, onDelete, onCardClick }: CreditCardsListProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>(cards[0]?.id ?? "");

  if (cards.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className="material-icons" aria-hidden>
          credit_card_off
        </span>
        <p>У вас нет добавленных кредитных карт</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.cardsGrid}>
        {cards.map((card) => {
          const debt = card.debt ?? (card.limit - card.available);
          const utilizationPercent = Math.round((debt / card.limit) * 100);
          const isSelected = card.id === selectedCardId;

          return (
            <div
              key={card.id}
              className={`${styles.card} ${isSelected ? styles.cardActive : ""}`}
            >
              <div
                className={styles.cardContent}
                onClick={() => {
                  setSelectedCardId(card.id);
                  if (onCardClick) {
                    onCardClick(card);
                  }
                }}
              >
                <div className={styles.cardBank}>{card.bank}</div>
                <div className={styles.cardBalance}>{formatMoney(debt, card.currency)}</div>
                <div className={styles.cardBalanceLabel}>Задолженность</div>

                <div className={styles.cardFooter}>
                  <div className={styles.cardInfo}>
                    <span>Лимит: {formatMoney(card.limit, card.currency)}</span>
                    <span>Доступно: {formatMoney(card.available, card.currency)}</span>
                  </div>
                </div>

                <div className={styles.utilizationBar}>
                  <div
                    className={styles.utilizationFill}
                    style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                  />
                </div>
                <div className={styles.utilizationText}>Использование: {utilizationPercent}%</div>
              </div>

              {(onEdit || onDelete) && (
                <div className={styles.cardActions}>
                  {onEdit && (
                    <button
                      type="button"
                      className={styles.cardActionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onEdit(card);
                      }}
                      aria-label="Редактировать"
                    >
                      <span className="material-icons" aria-hidden>
                        edit
                      </span>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className={`${styles.cardActionBtn} ${styles.cardActionBtnDelete}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (confirm(`Удалить карту "${card.bank}"?`)) {
                          onDelete(card.id);
                        }
                      }}
                      aria-label="Удалить"
                    >
                      <span className="material-icons" aria-hidden>
                        delete
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
