"use client";

import { useState, useCallback, useId } from "react";
import { useFormStatus } from "react-dom";
import { addCardAction } from "./actions";
import styles from "./cards.module.css";

type AddCardModalProps = {
  triggerClassName?: string;
};

const currencies = [
  { value: "RUB", label: "Российский рубль" },
  { value: "USD", label: "Доллар США" },
  { value: "EUR", label: "Евро" },
];

const colors = [
  { value: "blue", style: { background: "linear-gradient(135deg, #1565c0, #03a9f4)" } },
  { value: "red", style: { background: "linear-gradient(135deg, #c62828, #f44336)" } },
  { value: "green", style: { background: "linear-gradient(135deg, #2e7d32, #4caf50)" } },
  { value: "pink", style: { background: "linear-gradient(135deg, #9c27b0, #e91e63)" } },
];

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
  const [currency, setCurrency] = useState<string>(currencies[0]?.value ?? "RUB");
  const [color, setColor] = useState<string>(colors[0]?.value ?? "blue");
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
                <input type="hidden" name="card_color" value={color} />

                <div className={styles.formField}>
                  <label htmlFor="card-currency">Валюта карты</label>
                  <select
                    id="card-currency"
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    required
                  >
                    {currencies.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

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

                <div className={styles.formField}>
                  <label>Цвет карты</label>
                  <div className={styles.colorOptions}>
                    {colors.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.colorSwatch}${color === option.value ? " " + styles.colorSwatchActive : ""}`}
                        style={option.style}
                        onClick={() => setColor(option.value)}
                        aria-pressed={color === option.value}
                      />
                    ))}
                  </div>
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
