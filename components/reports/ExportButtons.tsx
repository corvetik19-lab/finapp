"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Table, Loader2 } from "lucide-react";

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
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleExportPdf} disabled={loadingPdf}>
        {loadingPdf ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />PDF...</> : <><FileText className="h-4 w-4 mr-1" />PDF</>}
      </Button>
      <Button variant="outline" onClick={handleExportExcel} disabled={loadingExcel}>
        {loadingExcel ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Excel...</> : <><Table className="h-4 w-4 mr-1" />Excel</>}
      </Button>
    </div>
  );
}
