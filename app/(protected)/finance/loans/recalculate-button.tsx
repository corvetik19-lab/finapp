"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

export default function RecalculateButton() {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/loans/recalculate", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to recalculate loans");
      }

      setMessage(`✅ ${data.message}`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="mb-5 space-y-2">
      <Button onClick={handleRecalculate} disabled={isRecalculating} variant="default" className="bg-green-600 hover:bg-green-700">
        {isRecalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        {isRecalculating ? "Пересчёт..." : "Пересчитать остатки долга"}
      </Button>
      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-600">❌ {error}</p>}
    </div>
  );
}
