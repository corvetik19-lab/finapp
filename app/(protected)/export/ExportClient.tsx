"use client";

import { useState } from "react";
import styles from "./Export.module.css";

export default function ExportClient() {
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [period, setPeriod] = useState<"month" | "quarter" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getDateRange(): { start: string; end: string } {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case "month":
        start.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(now.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(now.getFullYear() - 1);
        break;
      case "custom":
        if (!startDate || !endDate) {
          throw new Error("Укажите начальную и конечную дату");
        }
        return { start: startDate, end: endDate };
    }

    return {
      start: start.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
    };
  }

  async function handleExport() {
    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange();

      const url = `/api/export?format=${format}&start=${start}&end=${end}`;
      const res = await fetch(url);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || "Ошибка экспорта");
      }

      // Скачиваем файл
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `finapp-report-${start}-${end}.${format === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось экспортировать");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📄 Экспорт отчётов</h1>
        <p className={styles.subtitle}>
          Скачайте детальный отчёт в PDF или Excel
        </p>
      </div>

      <div className={styles.card}>
        {/* Формат */}
        <div className={styles.section}>
          <label className={styles.label}>Формат</label>
          <div className={styles.formatGrid}>
            <button
              className={`${styles.formatBtn} ${format === "pdf" ? styles.active : ""}`}
              onClick={() => setFormat("pdf")}
            >
              <div className={styles.formatIcon}>📄</div>
              <div className={styles.formatName}>PDF</div>
              <div className={styles.formatDesc}>Читабельный отчёт</div>
            </button>
            <button
              className={`${styles.formatBtn} ${format === "excel" ? styles.active : ""}`}
              onClick={() => setFormat("excel")}
            >
              <div className={styles.formatIcon}>📊</div>
              <div className={styles.formatName}>Excel</div>
              <div className={styles.formatDesc}>Для анализа данных</div>
            </button>
          </div>
        </div>

        {/* Период */}
        <div className={styles.section}>
          <label className={styles.label}>Период</label>
          <div className={styles.periodGrid}>
            <button
              className={`${styles.periodBtn} ${period === "month" ? styles.active : ""}`}
              onClick={() => setPeriod("month")}
            >
              Последний месяц
            </button>
            <button
              className={`${styles.periodBtn} ${period === "quarter" ? styles.active : ""}`}
              onClick={() => setPeriod("quarter")}
            >
              Последние 3 месяца
            </button>
            <button
              className={`${styles.periodBtn} ${period === "year" ? styles.active : ""}`}
              onClick={() => setPeriod("year")}
            >
              Последний год
            </button>
            <button
              className={`${styles.periodBtn} ${period === "custom" ? styles.active : ""}`}
              onClick={() => setPeriod("custom")}
            >
              Произвольный период
            </button>
          </div>

          {period === "custom" && (
            <div className={styles.customPeriod}>
              <div className={styles.inputGroup}>
                <label>От</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>До</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>
          )}
        </div>

        {/* Что будет включено */}
        <div className={styles.section}>
          <label className={styles.label}>Что будет в отчёте</label>
          <div className={styles.included}>
            <div className={styles.includedItem}>
              ✅ Сводная информация (доходы, расходы, баланс)
            </div>
            <div className={styles.includedItem}>
              ✅ Расходы по категориям с процентами
            </div>
            <div className={styles.includedItem}>
              ✅ Детализация всех транзакций
            </div>
            {format === "excel" && (
              <>
                <div className={styles.includedItem}>
                  ✅ Автофильтры и возможность сортировки
                </div>
                <div className={styles.includedItem}>
                  ✅ Несколько листов (Сводка, Категории, Транзакции)
                </div>
              </>
            )}
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {/* Кнопка экспорта */}
        <button
          className={styles.exportBtn}
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className={styles.spinner}>⏳</span>
              Создаём отчёт...
            </>
          ) : (
            <>
              ⬇️ Скачать {format === "pdf" ? "PDF" : "Excel"}
            </>
          )}
        </button>
      </div>

      {/* Инструкция */}
      <div className={styles.info}>
        <h3>💡 Подсказка</h3>
        <p>
          <strong>PDF</strong> — идеально для печати и отправки по email
        </p>
        <p>
          <strong>Excel</strong> — позволяет дальше анализировать данные, строить
          собственные графики и делать сводные таблицы
        </p>
      </div>
    </div>
  );
}
