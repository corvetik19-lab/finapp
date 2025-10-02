"use client";

import React from "react";
import { useToast } from "./ToastContext";
import styles from "./toast.module.css";

export default function ToastContainer() {
  const { toasts, hide } = useToast();

  return (
    <div className={styles.container} aria-live="polite" aria-atomic>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type]}`} role="status">
          <div className={styles.message}>{t.message}</div>
          <button className={styles.close} aria-label="Закрыть" onClick={() => hide(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
