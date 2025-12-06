"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
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
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        onClick={() => setIsModalOpen(true)}
        title="Добавить чек"
        aria-label="Добавить чек"
      >
        <FilePlus className="h-6 w-6" />
      </Button>

      {isModalOpen && (
        <ReceiptChatModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
