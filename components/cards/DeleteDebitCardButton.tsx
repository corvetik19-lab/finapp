"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type DeleteDebitCardButtonProps = {
  cardId: string;
  cardName: string;
  className?: string;
};

export default function DeleteDebitCardButton({
  cardId,
  cardName,
  className,
}: DeleteDebitCardButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    const confirmed = confirm(
      `Вы уверены, что хотите удалить карту "${cardName}"?\n\n` +
        `ВНИМАНИЕ: Это действие также удалит ВСЕ транзакции, связанные с этой картой, и кубышку (если есть).\n\n` +
        `Это действие нельзя отменить!`
    );

    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/debit-cards/${cardId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Не удалось удалить карту");
          return;
        }

        router.refresh();
      } catch (err) {
        console.error("Delete error:", err);
        setError("Произошла ошибка при удалении карты");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className={className}
        title="Удалить карту"
      >
        <span className="material-icons" aria-hidden>
          delete
        </span>
        {isPending && <span style={{ fontSize: 12 }}>Удаление...</span>}
      </button>
      {error && (
        <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>{error}</div>
      )}
    </>
  );
}
