"use client";

import { useCallback, useMemo, useState } from "react";

type Props = {
  className?: string;
  searchParams?: Record<string, string>;
};

export default function ExportCsvButton({ className, searchParams }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value && value.trim() !== "") {
          params.set(key, value);
        }
      }
    }
    const qs = params.toString();
    return qs.length > 0 ? `?${qs}` : "";
  }, [searchParams]);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/transactions/export${queryString}`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`Экспорт не удался (статус ${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const datePart = now.toISOString().slice(0, 10);
      link.href = url;
      link.download = `transactions-${datePart}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage("Экспорт успешно выполнен");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Не удалось экспортировать CSV";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [loading, queryString]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={loading}
      >
        <span className="material-icons" aria-hidden>file_download</span>
        {loading ? "Экспорт..." : "Экспорт"}
      </button>
      {message && (
        <span style={{ fontSize: 12, color: message.startsWith("Экспорт") ? "#15803d" : "#b91c1c" }}>{message}</span>
      )}
    </div>
  );
}
