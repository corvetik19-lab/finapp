"use client";

import { useState, useCallback, useId } from "react";
import styles from "./cards.module.css";

export default function ReportsModal() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  const handleOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <button type="button" className={styles.actionCard} onClick={handleOpen}>
        <div className={styles.actionIcon}>
          <i className="material-icons">assessment</i>
        </div>
        <div className={styles.actionTitle}>Отчеты</div>
      </button>

      {open && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle} id={titleId}>
                Быстрые отчеты
              </div>
              <button className={styles.modalClose} type="button" onClick={handleClose} aria-label="Закрыть">
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>Отчеты в разработке. В финальной версии здесь появятся визуализации и ключевые метрики расходов и доходов.</p>
              <p>Пока вы можете открыть полный раздел отчетов для просмотра детальной аналитики.</p>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalActions}>
                <button className={styles.secondaryBtn} type="button" onClick={handleClose}>
                  Закрыть
                </button>
                <a className={styles.primaryBtn} href="/reports">
                  Перейти в отчеты
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
