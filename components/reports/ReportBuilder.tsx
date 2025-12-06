"use client";

import { useState, useEffect } from "react";
import type { ReportPeriod, ReportDataType, ReportBuilderConfig } from "@/lib/reports/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  name: string;
};

type ReportBuilderProps = {
  onGenerate: (config: ReportBuilderConfig) => void;
  onAddToChart?: () => void;
  isGenerating?: boolean;
};

const periodOptions: { value: ReportPeriod; label: string }[] = [
  { value: "today", label: "Сегодня" },
  { value: "week", label: "Текущая неделя" },
  { value: "month", label: "Текущий месяц" },
  { value: "quarter", label: "Текущий квартал" },
  { value: "year", label: "Текущий год" },
  { value: "custom", label: "Произвольный период" },
];

const dataTypeOptions: { value: ReportDataType; label: string }[] = [
  { value: "income", label: "Доходы" },
  { value: "expense", label: "Расходы" },
  { value: "loans", label: "Кредиты" },
  { value: "cards", label: "Карты" },
];

export default function ReportBuilder({ onGenerate, onAddToChart, isGenerating }: ReportBuilderProps) {
  const [reportName, setReportName] = useState("");
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [dataTypes, setDataTypes] = useState<ReportDataType[]>(["income", "expense"]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  // Debug: проверяем что dataTypes установлены
  useEffect(() => {
    console.log("ReportBuilder mounted, dataTypes:", dataTypes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Загрузка категорий и счетов
  useEffect(() => {
    loadCategoriesAndAccounts();
  }, []);

  const loadCategoriesAndAccounts = async () => {
    try {
      // Загрузка категорий
      const catRes = await fetch("/api/categories");
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      // Загрузка счетов
      const accRes = await fetch("/api/accounts");
      if (accRes.ok) {
        const accData = await accRes.json();
        setAccounts(accData.accounts || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const toggleDataType = (type: ReportDataType) => {
    setDataTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };

  const selectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(c => c.id));
    }
  };

  const handleGenerate = () => {
    console.log("handleGenerate called, current dataTypes:", dataTypes);
    
    if (dataTypes.length === 0) {
      alert("Выберите хотя бы один тип данных");
      return;
    }

    const config: ReportBuilderConfig = {
      name: reportName || "Без названия",
      period,
      dataTypes,
      categories: selectedCategories,
      accounts: selectedAccounts,
    };

    if (period === "custom") {
      config.dateFrom = customDateFrom;
      config.dateTo = customDateTo;
    }

    console.log("Generating report with config:", config);
    onGenerate(config);
  };

  const handleAddToChart = () => {
    if (!onAddToChart) return;

    if (dataTypes.length === 0) {
      alert("Выберите хотя бы один тип данных");
      return;
    }

    onAddToChart();
  };

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Создать пользовательский отчет</h2>
        <div className="flex gap-2">
          {onAddToChart && (
            <Button variant="outline" onClick={handleAddToChart} disabled={isGenerating}>
              Добавить в график
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isGenerating ? "Формирование..." : "Сформировать"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Период */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Период</label>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    period === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  )}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-1">
                  <label htmlFor="dateFrom" className="text-sm">От</label>
                  <Input
                    type="date"
                    id="dateFrom"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="dateTo" className="text-sm">До</label>
                  <Input
                    type="date"
                    id="dateTo"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Данные */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Данные {dataTypes.length > 0 && `(выбрано: ${dataTypes.length})`}
            </label>
            <div className="flex flex-wrap gap-2">
              {dataTypeOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    dataTypes.includes(opt.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  )}
                  onClick={() => toggleDataType(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Название */}
          <div className="space-y-2">
            <label htmlFor="reportName" className="text-sm font-medium">
              Название отчета
            </label>
            <Input
              type="text"
              id="reportName"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Введите название отчета"
            />
          </div>

          {/* Категории */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Категории</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAllCategories}
              >
                {selectedCategories.length === categories.length ? "Снять все" : "Выбрать все"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {categories.length === 0 ? (
                <div className="text-sm text-muted-foreground">Нет доступных категорий</div>
              ) : (
                categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md border transition-colors",
                      selectedCategories.includes(cat.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    )}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {cat.name}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Счета/Карты */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Счета/Карты</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {accounts.length === 0 ? (
                <div className="text-sm text-muted-foreground">Нет доступных счетов</div>
              ) : (
                accounts.map(acc => (
                  <button
                    key={acc.id}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md border transition-colors",
                      selectedAccounts.includes(acc.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted"
                    )}
                    onClick={() => toggleAccount(acc.id)}
                  >
                    {acc.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
