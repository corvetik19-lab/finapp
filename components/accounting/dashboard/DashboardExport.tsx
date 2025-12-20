"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";

interface DashboardExportProps {
  periodStart: Date;
  periodEnd: Date;
  onExportPdf?: () => Promise<void>;
  onExportExcel?: () => Promise<void>;
}

const EXPORT_SECTIONS = [
  { id: "financial", label: "Финансовый обзор" },
  { id: "receivables", label: "Дебиторская задолженность" },
  { id: "payables", label: "Кредиторская задолженность" },
  { id: "tenders", label: "Рентабельность тендеров" },
  { id: "taxes", label: "Налоговый календарь" },
  { id: "invoices", label: "Неоплаченные счета" },
];

export function DashboardExport({
  periodStart,
  periodEnd,
  onExportPdf,
  onExportExcel,
}: DashboardExportProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(EXPORT_SECTIONS.map((s) => s.id))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<"pdf" | "excel">("pdf");

  const toggleSection = (id: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSections(newSelected);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportType === "pdf" && onExportPdf) {
        await onExportPdf();
      } else if (exportType === "excel" && onExportExcel) {
        await onExportExcel();
      }
      setIsDialogOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  const openExportDialog = (type: "pdf" | "excel") => {
    setExportType(type);
    setIsDialogOpen(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openExportDialog("pdf")}>
            <FileText className="h-4 w-4 mr-2" />
            Экспорт в PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openExportDialog("excel")}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Экспорт в Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Экспорт дашборда в {exportType === "pdf" ? "PDF" : "Excel"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">Период:</span>{" "}
              <span className="font-medium">
                {formatDate(periodStart)} — {formatDate(periodEnd)}
              </span>
            </div>

            <div className="space-y-3">
              <Label>Выберите разделы для экспорта:</Label>
              {EXPORT_SECTIONS.map((section) => (
                <div key={section.id} className="flex items-center gap-2">
                  <Checkbox
                    id={section.id}
                    checked={selectedSections.has(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <Label htmlFor={section.id} className="font-normal cursor-pointer">
                    {section.label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || selectedSections.size === 0}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Экспорт...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Экспортировать
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
