"use client";

import { useState, useEffect } from "react";
import type { ReportPeriod, ReportDataType, ReportBuilderConfig } from "@/lib/reports/types";
import styles from "./ReportBuilder.module.css";

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
  { value: "month", label: "Текущий месяц" },
  { value: "last_month", label: "Прошлый месяц" },
  { value: "quarter", label: "Текущий квартал" },
  { value: "year", label: "Текущий год" },
  { value: "custom", label: "Произвольный" },
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Создать пользовательский отчет</h2>
        <div className={styles.actions}>
          {onAddToChart && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleAddToChart}
              disabled={isGenerating}
            >
              Добавить в график
            </button>
          )}
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Формирование..." : "Сформировать"}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          {/* Период */}
          <div className={styles.group}>
            <label className={styles.label}>Период</label>
            <div className={styles.options}>
              {periodOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`${styles.option} ${period === opt.value ? styles.active : ""}`}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </div>
              ))}
            </div>

            {period === "custom" && (
              <div className={styles.customPeriod}>
                <div className={styles.inputGroup}>
                  <label htmlFor="dateFrom">От</label>
                  <input
                    type="date"
                    id="dateFrom"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label htmlFor="dateTo">До</label>
                  <input
                    type="date"
                    id="dateTo"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Данные */}
          <div className={styles.group}>
            <label className={styles.label}>
              Данные {dataTypes.length > 0 && `(выбрано: ${dataTypes.length})`}
            </label>
            <div className={styles.options}>
              {dataTypeOptions.map(opt => (
                <div
                  key={opt.value}
                  className={`${styles.option} ${dataTypes.includes(opt.value) ? styles.active : ""}`}
                  onClick={() => toggleDataType(opt.value)}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          {/* Название */}
          <div className={styles.group}>
            <label htmlFor="reportName" className={styles.label}>
              Название отчета
            </label>
            <input
              type="text"
              id="reportName"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Введите название отчета"
              className={styles.input}
            />
          </div>

          {/* Категории */}
          <div className={styles.group}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Категории</label>
              <button
                type="button"
                className={styles.miniBtn}
                onClick={selectAllCategories}
              >
                {selectedCategories.length === categories.length ? "Снять все" : "Выбрать все"}
              </button>
            </div>
            <div className={styles.options}>
              {categories.length === 0 ? (
                <div className={styles.empty}>Нет доступных категорий</div>
              ) : (
                categories.map(cat => (
                  <div
                    key={cat.id}
                    className={`${styles.option} ${selectedCategories.includes(cat.id) ? styles.active : ""}`}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    {cat.name}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Счета/Карты */}
          <div className={styles.group}>
            <label className={styles.label}>Счета/Карты</label>
            <div className={styles.options}>
              {accounts.length === 0 ? (
                <div className={styles.empty}>Нет доступных счетов</div>
              ) : (
                accounts.map(acc => (
                  <div
                    key={acc.id}
                    className={`${styles.option} ${selectedAccounts.includes(acc.id) ? styles.active : ""}`}
                    onClick={() => toggleAccount(acc.id)}
                  >
                    {acc.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
