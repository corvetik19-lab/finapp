"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Loader2 } from "lucide-react";

interface CallButtonProps {
  phoneNumber: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost";
  showNumber?: boolean;
}

export function CallButton({
  phoneNumber,
  size = "sm",
  variant = "outline",
  showNumber = false,
}: CallButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCall = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/telephony/mango/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ toNumber: phoneNumber }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Ошибка при звонке");
      }
    } catch (err) {
      console.error("Call error:", err);
      setError("Ошибка соединения");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
      return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
    }
    return phone;
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleCall}
        disabled={isLoading}
        title={error || `Позвонить: ${formatPhone(phoneNumber)}`}
        className={error ? "border-red-300" : ""}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Phone className="h-4 w-4" />
        )}
        {showNumber && <span className="ml-1">{formatPhone(phoneNumber)}</span>}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
