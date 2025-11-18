"use client";

import { useState, useCallback, useId } from "react";
import { useFormStatus } from "react-dom";
import { addCardAction } from "./actions";
import styles from "./cards.module.css";

type AddCardModalProps = {
  triggerClassName?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.primaryBtn} type="submit" disabled={pending}>
      {pending ? "Добавляем..." : "Добавить карту"}
    </button>
  );
}

export default function AddCardModal({ triggerClassName }: AddCardModalProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button className={triggerClassName} type="button" onClick={handleOpen}>
        <i className="material-icons" aria-hidden>
          add
        </i>
        Добавить карту
      </button>

      {open && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle} id={titleId}>
                Добавить новую карту
              </div>
              <button className={styles.modalClose} type="button" onClick={handleClose} aria-label="Закрыть">
                ×
              </button>
            </div>

            <form
              action={async (formData) => {
                await addCardAction(formData);
                handleClose();
              }}
            >
              <div className={styles.modalBody}>
                <div className={styles.formField}>
                  <label htmlFor="card-name">Название карты</label>
                  <input id="card-name" name="name" placeholder="Например, Основная карта" required />
                </div>

                <input type="hidden" name="card_type" value="debit" />
                <input type="hidden" name="card_color" value="blue" />
                <input type="hidden" name="currency" value="RUB" />

                <div className={styles.formField}>
                  <label htmlFor="card-balance">Начальный баланс (₽)</label>
                  <input
                    id="card-balance"
                    name="initial_balance"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>

                <label className={styles.modalCheckbox}>
                  <input type="checkbox" name="create_stash" defaultChecked />
                  <span>
                    <strong>Создать Кубышку</strong>
                    <span>Виртуальный счёт для накоплений с целевым балансом 50 000 ₽</span>
                  </span>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button className={styles.secondaryBtn} type="button" onClick={handleClose}>
                    Отмена
                  </button>
                  <SubmitButton />
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
