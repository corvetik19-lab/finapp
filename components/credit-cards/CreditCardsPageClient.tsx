"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./CreditCardsPageClient.module.css";
import CreditCardsList, { type CreditCard } from "./CreditCardsList";
import CreditCardDetails from "./CreditCardDetails";
import CreateCreditCardModal from "./CreateCreditCardModal";
import CreditCardTransactionsModal from "./CreditCardTransactionsModal";

export type CreditCardsPageClientProps = {
  initialCards: CreditCard[];
};

export default function CreditCardsPageClient({ initialCards }: CreditCardsPageClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>(initialCards[0]?.id ?? "");
  const [transactionsModalCard, setTransactionsModalCard] = useState<CreditCard | null>(null);

  const selectedCard = initialCards.find((card) => card.id === selectedCardId) || initialCards[0] || null;

  const handleCreateCard = () => {
    setIsModalOpen(false);
    setEditingCard(null);
    router.refresh();
  };

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleDelete = async (cardId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/credit-cards/${cardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Ошибка при удалении карты");
      }

      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при удалении карты");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCard(null);
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Кредитные карты</h1>
          <p className={styles.subtitle}>Управление кредитными картами и задолженностью</p>
        </div>
        <button className={styles.addButton} onClick={() => setIsModalOpen(true)} disabled={isDeleting}>
          <span className="material-icons" aria-hidden>
            add
          </span>
          Добавить карту
        </button>
      </header>

      <CreditCardsList
        cards={initialCards}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCardClick={(card) => setTransactionsModalCard(card)}
      />

      {initialCards.length > 0 && selectedCard && (
        <>
          <div className={styles.cardSelector}>
            <label htmlFor="cardSelector" className={styles.cardSelectorLabel}>
              Выберите карту:
            </label>
            <select
              id="cardSelector"
              className={styles.cardSelectorSelect}
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
            >
              {initialCards.map((card) => (
                <option key={card.id} value={card.id}>
                  🏦 {card.bank} {card.cardNumberLast4 ? `•••• ${card.cardNumberLast4}` : ""}
                </option>
              ))}
            </select>
          </div>

          <CreditCardDetails card={selectedCard} />
        </>
      )}

      <CreateCreditCardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleCreateCard}
        editingCard={editingCard}
      />

      {transactionsModalCard && (
        <CreditCardTransactionsModal
          isOpen={true}
          onClose={() => setTransactionsModalCard(null)}
          card={transactionsModalCard}
        />
      )}
    </div>
  );
}
