"use client";

import { useState } from "react";
import styles from "./Reports.module.css";

interface ExportButtonsProps {
  startDate?: string;
  endDate?: string;
}

export default function ExportButtons({ startDate, endDate }: ExportButtonsProps) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  const handleExportPdf = async () => {
    try {
      setLoadingPdf(true);
      
      // Формируем URL с параметрами
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      
      const url = `/api/export/pdf?${params.toString()}`;
      
      // Открываем в новом окне для скачивания
      window.open(url, '_blank');
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Ошибка при экспорте PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoadingExcel(true);
      
      // Формируем URL с параметрами
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      
      const url = `/api/export/excel?${params.toString()}`;
      
      // Скачиваем файл
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      // Получаем blob
      const blob = await response.blob();
      
      // Создаём ссылку для скачивания
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `finapp_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Ошибка при экспорте Excel');
    } finally {
      setLoadingExcel(false);
    }
  };

  return (
    <div className={styles.exportButtons}>
      <button
        onClick={handleExportPdf}
        disabled={loadingPdf}
        className={styles.exportButton}
        title="Экспорт в PDF"
      >
        {loadingPdf ? (
          <>
            <span className={styles.spinner}></span>
            Генерация PDF...
          </>
        ) : (
          <>
            <span className="material-icons">picture_as_pdf</span>
            PDF
          </>
        )}
      </button>

      <button
        onClick={handleExportExcel}
        disabled={loadingExcel}
        className={`${styles.exportButton} ${styles.exportButtonExcel}`}
        title="Экспорт в Excel"
      >
        {loadingExcel ? (
          <>
            <span className={styles.spinner}></span>
            Генерация Excel...
          </>
        ) : (
          <>
            <span className="material-icons">table_chart</span>
            Excel
          </>
        )}
      </button>
    </div>
  );
}
