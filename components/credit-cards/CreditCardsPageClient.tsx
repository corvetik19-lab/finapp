"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CreditCardsList, { type CreditCard } from "./CreditCardsList";
import CreditCardDetails from "./CreditCardDetails";
import CreateCreditCardModal from "./CreateCreditCardModal";
import CreditCardTransactionsModal from "./CreditCardTransactionsModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";

export type CreditCardsPageClientProps = {
  initialCards: CreditCard[];
};

export default function CreditCardsPageClient({ initialCards }: CreditCardsPageClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>(initialCards[0]?.id ?? "");
  const [transactionsModalCard, setTransactionsModalCard] = useState<CreditCard | null>(null);

  const selectedCard = initialCards.find((card) => card.id === selectedCardId) || initialCards[0] || null;

  const handleCreateCard = () => {
    setIsModalOpen(false);
    toast.show(editingCard ? "Карта обновлена" : "Карта добавлена", { type: "success" });
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

      toast.show("Карта удалена", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      toast.show(error instanceof Error ? error.message : "Ошибка при удалении карты", { type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCard(null);
  };

  const handleUpdateMinPayment = async (cardId: string, amount: number) => {
    try {
      const response = await fetch(`/api/credit-cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ min_payment_amount: amount }),
      });

      if (!response.ok) {
        throw new Error("Ошибка при обновлении минимального платежа");
      }

      toast.show("Минимальный платёж обновлён", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Update min payment error:", error);
      toast.show(error instanceof Error ? error.message : "Ошибка при обновлении", { type: "error" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Кредитные карты</h1><p className="text-muted-foreground">Управление кредитными картами и задолженностью</p></div>
        <Button onClick={() => setIsModalOpen(true)} disabled={isDeleting}><Plus className="h-4 w-4 mr-1" />Добавить карту</Button>
      </div>

      <CreditCardsList cards={initialCards} onEdit={handleEdit} onDelete={handleDelete} onCardClick={(card) => setTransactionsModalCard(card)} onUpdateMinPayment={handleUpdateMinPayment} />

      {initialCards.length > 0 && selectedCard && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Выберите карту:</span>
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {initialCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>🏦 {card.bank} {card.cardNumberLast4 ? `•••• ${card.cardNumberLast4}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <CreditCardDetails card={selectedCard} />
        </div>
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
