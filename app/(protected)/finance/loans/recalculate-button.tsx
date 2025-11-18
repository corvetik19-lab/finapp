"use client";

import { useState } from "react";

export default function RecalculateButton() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/loans/recalculate", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to recalculate loans");
      }

      setMessage(`✅ ${data.message}`);
      
      // Перезагружаем страницу через 2 секунды
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={handleRecalculate}
        disabled={isRecalculating}
        style={{
          padding: "10px 20px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isRecalculating ? "not-allowed" : "pointer",
          fontSize: "14px",
        }}
      >
        {isRecalculating ? "Пересчёт..." : "🔄 Пересчитать остатки долга"}
      </button>
      {message && (
        <div style={{ marginTop: 10, color: "#4CAF50", fontSize: "14px" }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ marginTop: 10, color: "#f44336", fontSize: "14px" }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
}
