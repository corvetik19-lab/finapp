"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Check, AlertCircle } from "lucide-react";

type Props = {
  searchParams?: Record<string, string>;
};

export default function ExportCsvButton({ searchParams }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value && value.trim() !== "") params.set(key, value);
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
      const response = await fetch(`/transactions/export${queryString}`, { method: "GET" });
      if (!response.ok) throw new Error(`Экспорт не удался (статус ${response.status})`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage({ text: "Экспорт успешно выполнен", success: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Не удалось экспортировать", success: false });
    } finally {
      setLoading(false);
    }
  }, [loading, queryString]);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
        {loading ? "Экспорт..." : "Экспорт"}
      </Button>
      {message && (
        <span className={`text-xs flex items-center gap-1 ${message.success ? "text-green-600" : "text-red-600"}`}>
          {message.success ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {message.text}
        </span>
      )}
    </div>
  );
}
