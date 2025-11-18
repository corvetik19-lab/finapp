"use client";

import { useState, useEffect } from "react";
import styles from "./FloatingReceiptButton.module.css";
import ReceiptChatModal from "./ReceiptChatModal";

export default function FloatingReceiptButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Проверяем localStorage после монтирования компонента
  useEffect(() => {
    const hasPreview = localStorage.getItem('receiptChatPreview');
    const hasInput = localStorage.getItem('receiptChatInput');
    const hasText = localStorage.getItem('receiptChatText');
    
    if (hasPreview || hasInput || hasText) {
      setIsModalOpen(true);
    }
  }, []);

  return (
    <>
      <button
        className={styles.floatingButton}
        onClick={() => setIsModalOpen(true)}
        title="Добавить чек"
        aria-label="Добавить чек"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      </button>

      {isModalOpen && (
        <ReceiptChatModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
