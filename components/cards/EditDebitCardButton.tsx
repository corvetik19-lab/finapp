"use client";

import { useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import { updateCardAction } from "@/app/(protected)/cards/actions";
import styles from "@/app/(protected)/cards/cards.module.css";

type EditDebitCardButtonProps = {
  cardId: string;
  cardName: string;
  className?: string;
};

export default function EditDebitCardButton({
  cardId,
  cardName,
  className,
}: EditDebitCardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(cardName);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const titleId = useId();

  const handleOpen = () => {
    setName(cardName);
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateCardAction(formData);
        handleClose();
        router.refresh();
      } catch (err) {
        console.error("Update error:", err);
        setError(err instanceof Error ? err.message : "Произошла ошибка");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={className}
        title="Редактировать карту"
      >
        <span className="material-icons" aria-hidden>
          edit
        </span>
      </button>

      {isOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle} id={titleId}>
                Редактировать карту
              </div>
              <button
                className={styles.modalClose}
                type="button"
                onClick={handleClose}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input type="hidden" name="id" value={cardId} />
              
              <div className={styles.modalBody}>
                <div className={styles.formField}>
                  <label htmlFor={`edit-card-name-${cardId}`}>Название карты</label>
                  <input
                    id={`edit-card-name-${cardId}`}
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например, Основная карта"
                    required
                  />
                </div>

                {error && (
                  <div style={{ color: "#d14343", fontSize: "14px", marginTop: "8px" }}>
                    {error}
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button
                    className={styles.secondaryBtn}
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    Отмена
                  </button>
                  <button
                    className={styles.primaryBtn}
                    type="submit"
                    disabled={isPending}
                  >
                    {isPending ? "Сохраняем..." : "Сохранить"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
