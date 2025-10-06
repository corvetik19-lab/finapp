"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReportBuilder from "@/components/reports/ReportBuilder";
import ReportChart from "@/components/reports/ReportChart";
import ReportsList from "@/components/reports/ReportsList";
import type { ReportBuilderConfig, ReportData, Report } from "@/lib/reports/types";
import { exportToCSV } from "@/lib/reports/utils";
import styles from "./CustomReports.module.css";

export default function CustomReportsPage() {
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ReportBuilderConfig | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: "",
    category: "Пользовательские",
    reportType: "table" as const,
    format: "preview" as const,
  });

  // Для сравнения отчётов
  const [comparisonReports, setComparisonReports] = useState<Array<{ name: string; data: ReportData }>>([]);

  useEffect(() => {
    loadSavedReports();
  }, []);

  // Отрисовка графика сравнения
  useEffect(() => {
    if (comparisonReports.length === 0) return;

    const canvas = document.getElementById('comparisonCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Динамический импорт Chart.js
    import('chart.js/auto').then(({ default: Chart }) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Уничтожаем предыдущий график
      const existingChart = Chart.getChart(canvas);
      if (existingChart) {
        existingChart.destroy();
      }

      // Подготовка данных
      const labels = comparisonReports.map(r => r.name);
      const incomeData = comparisonReports.map(r => r.data.summary.totalIncome);
      const expenseData = comparisonReports.map(r => r.data.summary.totalExpense);
      const balanceData = comparisonReports.map(r => r.data.summary.balance);

      console.log('Comparison Chart Data:', {
        labels,
        incomeData,
        expenseData,
        balanceData,
        reports: comparisonReports.map(r => ({ 
          name: r.name, 
          income: r.data.summary.totalIncome,
          expense: r.data.summary.totalExpense 
        }))
      });

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Доходы',
              data: incomeData,
              backgroundColor: 'rgba(76, 175, 80, 0.7)',
              borderColor: 'rgb(76, 175, 80)',
              borderWidth: 2,
            },
            {
              label: 'Расходы',
              data: expenseData,
              backgroundColor: 'rgba(244, 67, 54, 0.7)',
              borderColor: 'rgb(244, 67, 54)',
              borderWidth: 2,
            },
            {
              label: 'Баланс',
              data: balanceData,
              backgroundColor: 'rgba(33, 150, 243, 0.7)',
              borderColor: 'rgb(33, 150, 243)',
              borderWidth: 2,
              type: 'line',
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Сравнение финансовых показателей',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB'
                  }).format(context.parsed.y);
                  return label;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 0
                  }).format(value as number);
                }
              }
            }
          }
        }
      });
    });
  }, [comparisonReports]);

  const loadSavedReports = async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setSavedReports(data.reports || []);
      }
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (config: ReportBuilderConfig) => {
    setIsGenerating(true);
    setCurrentConfig(config); // Сохраняем конфиг для возможности сохранения отчёта
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: config.period,
          dateFrom: config.dateFrom,
          dateTo: config.dateTo,
          dataTypes: config.dataTypes,
          categories: config.categories,
          accounts: config.accounts,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error || "Failed to generate report");
      }

      const result = await res.json();
      setReportData(result.data);
      setSaveForm(prev => ({ ...prev, name: config.name || "" }));
    } catch (error) {
      console.error("Error generating report:", error);
      alert(`Ошибка при формировании отчёта: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToChart = async () => {
    if (!reportData) {
      alert("Сначала сформируйте отчёт");
      return;
    }
    
    // Создаем уникальное имя с периодом и временной меткой
    const periodLabel = currentConfig?.period === "month" ? "Текущий месяц" :
                        currentConfig?.period === "last_month" ? "Прошлый месяц" :
                        currentConfig?.period === "quarter" ? "Квартал" :
                        currentConfig?.period === "year" ? "Год" : "Произвольный";
    
    const reportName = currentConfig?.name && currentConfig.name !== "Без названия" 
      ? currentConfig.name 
      : `${periodLabel} (${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})`;
    
    // Создаем глубокую копию данных чтобы избежать мутаций
    const dataCopy = JSON.parse(JSON.stringify(reportData));
    
    // Добавляем отчёт в список для сравнения
    setComparisonReports([...comparisonReports, {
      name: reportName,
      data: dataCopy
    }]);
    
    alert(`Отчёт "${reportName}" добавлен в график сравнения!\n\nДоходы: ${reportData.summary.totalIncome.toFixed(2)} ₽\nРасходы: ${reportData.summary.totalExpense.toFixed(2)} ₽`);
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    // Экспорт транзакций в CSV
    const csvData = reportData.transactions.map(t => ({
      Дата: t.date,
      Описание: t.description,
      Категория: t.category,
      Счёт: t.account,
      Сумма: t.amount,
      Тип: t.direction === "income" ? "Доход" : "Расход",
    }));

    exportToCSV(csvData, `отчёт-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const handleExportPDF = () => {
    alert("Экспорт в PDF будет доступен в следующей версии");
  };

  const handleClear = () => {
    setReportData(null);
  };

  const handleSaveReport = async () => {
    if (!currentConfig) {
      alert("Сначала сформируйте отчёт");
      return;
    }

    if (!saveForm.name.trim()) {
      alert("Введите название отчёта");
      return;
    }

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveForm.name,
          category: saveForm.category,
          period: currentConfig.period,
          dateFrom: currentConfig.dateFrom,
          dateTo: currentConfig.dateTo,
          dataTypes: currentConfig.dataTypes,
          categories: currentConfig.categories,
          accounts: currentConfig.accounts,
          reportType: saveForm.reportType,
          format: saveForm.format,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save report");
      }

      alert("Отчёт сохранён!");
      setShowSaveModal(false);
      loadSavedReports();
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Ошибка при сохранении отчёта");
    }
  };

  const handleSelectReport = async (report: Report) => {
    // Загрузить данные выбранного отчёта
    handleGenerate({
      name: report.name,
      period: report.period,
      dateFrom: report.dateFrom || undefined,
      dateTo: report.dateTo || undefined,
      dataTypes: report.dataTypes || ["income", "expense"], // Дефолтные значения если не указано
      categories: report.categories || [],
      accounts: report.accounts || [],
    });
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete report");
      }

      // Обновить список
      setSavedReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      console.error("Error deleting report:", error);
      alert("Ошибка при удалении отчёта");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Пользовательские отчёты</h1>
        <button
          className={styles.backBtn}
          onClick={() => router.push("/reports")}
        >
          <span className="material-icons">arrow_back</span>
          К стандартным отчётам
        </button>
      </div>

      <ReportBuilder
        onGenerate={handleGenerate}
        onAddToChart={handleAddToChart}
        isGenerating={isGenerating}
      />

      <ReportChart
        data={reportData}
        type="bar"
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onClear={handleClear}
      />

      {/* Таблица детализации вынесена отдельно */}
      {reportData && (
        <div className={styles.detailsSection}>
          <h4>Детализация</h4>
          <table className={styles.detailsTable}>
            <thead>
              <tr>
                <th>Категория</th>
                <th style={{ color: '#4caf50' }}>Доходы</th>
                <th style={{ color: '#f44336' }}>Расходы</th>
                <th>Итого</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(
                reportData.transactions.reduce((map, t) => {
                  const key = t.category || "Без категории";
                  if (!map.has(key)) {
                    map.set(key, { income: 0, expense: 0 });
                  }
                  const group = map.get(key)!;
                  if (t.direction === "income") {
                    group.income += t.amount;
                  } else if (t.direction === "expense") {
                    group.expense += t.amount;
                  }
                  return map;
                }, new Map<string, { income: number; expense: number }>())
              ).map(([category, values]) => (
                <tr key={category}>
                  <td><strong>{category}</strong></td>
                  <td style={{ color: '#4caf50' }}>
                    {values.income > 0 ? `+${values.income.toFixed(2)} ₽` : '—'}
                  </td>
                  <td style={{ color: '#f44336' }}>
                    {values.expense > 0 ? `-${values.expense.toFixed(2)} ₽` : '—'}
                  </td>
                  <td>
                    <strong>{(values.income - values.expense).toFixed(2)} ₽</strong>
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #ddd', fontWeight: 'bold' }}>
                <td>ИТОГО:</td>
                <td style={{ color: '#4caf50' }}>+{reportData.summary.totalIncome.toFixed(2)} ₽</td>
                <td style={{ color: '#f44336' }}>-{reportData.summary.totalExpense.toFixed(2)} ₽</td>
                <td style={{ color: reportData.summary.balance >= 0 ? '#4caf50' : '#f44336' }}>
                  {reportData.summary.balance.toFixed(2)} ₽
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {reportData && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          marginBottom: '60px', 
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <button
            className={styles.saveBtn}
            onClick={() => setShowSaveModal(true)}
          >
            <span className="material-icons">save</span>
            Сохранить отчёт
          </button>
        </div>
      )}

      {/* Блок сравнения отчётов */}
      {comparisonReports.length > 0 && (
        <div className={styles.comparisonSection}>
          <div className={styles.comparisonHeader}>
            <h2>График сравнения</h2>
            <button 
              className={styles.btnSecondary}
              onClick={() => setComparisonReports([])}
            >
              Очистить все
            </button>
          </div>
          
          <div className={styles.comparisonList}>
            {comparisonReports.map((report, index) => (
              <div key={`${report.name}-${index}`} className={styles.comparisonItem}>
                <div className={styles.comparisonInfo}>
                  <span className={styles.comparisonBadge} style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}>
                    {index + 1}
                  </span>
                  <div className={styles.comparisonDetails}>
                    <span className={styles.comparisonName}>{report.name}</span>
                    <div className={styles.comparisonStats}>
                      <span style={{ color: '#4caf50', fontWeight: 600 }}>
                        ↑ {report.data.summary.totalIncome.toFixed(2)} ₽
                      </span>
                      <span style={{ margin: '0 8px', color: '#999' }}>|</span>
                      <span style={{ color: '#f44336', fontWeight: 600 }}>
                        ↓ {report.data.summary.totalExpense.toFixed(2)} ₽
                      </span>
                      <span style={{ margin: '0 8px', color: '#999' }}>|</span>
                      <span style={{ color: report.data.summary.balance >= 0 ? '#4caf50' : '#f44336', fontWeight: 600 }}>
                        = {report.data.summary.balance.toFixed(2)} ₽
                      </span>
                      <span style={{ margin: '0 8px', color: '#999' }}>•</span>
                      <span style={{ color: '#666', fontSize: '13px' }}>
                        {report.data.summary.transactionCount} операций
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  className={styles.comparisonDelete}
                  onClick={() => setComparisonReports(comparisonReports.filter((_, i) => i !== index))}
                  title="Удалить из сравнения"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            ))}
          </div>

          {/* График сравнения */}
          <div className={styles.comparisonChart}>
            <canvas id="comparisonCanvas" style={{ maxHeight: '400px' }}></canvas>
          </div>
        </div>
      )}

      <div className={styles.savedReports}>
        <h2 className={styles.sectionTitle}>Сохранённые отчёты</h2>
        <p className={styles.sectionHint}>
          💡 Кликните на отчёт чтобы применить сохранённые фильтры и сформировать его заново
        </p>
        {isLoading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <ReportsList
            reports={savedReports}
            onSelect={handleSelectReport}
            onDelete={handleDeleteReport}
          />
        )}
      </div>

      {/* Модальное окно сохранения */}
      {showSaveModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaveModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Сохранить отчёт</h3>
              <button className={styles.closeBtn} onClick={() => setShowSaveModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.presetInfo}>
                <p>📌 Сохраняются все фильтры отчёта:</p>
                <ul>
                  <li>Период: <strong>{currentConfig?.period === "month" ? "Текущий месяц" : 
                               currentConfig?.period === "last_month" ? "Прошлый месяц" :
                               currentConfig?.period === "quarter" ? "Квартал" :
                               currentConfig?.period === "year" ? "Год" : "Произвольный"}</strong></li>
                  <li>Типы данных: <strong>{currentConfig?.dataTypes.map(t => 
                    t === "income" ? "Доходы" : t === "expense" ? "Расходы" : t
                  ).join(", ")}</strong></li>
                  {currentConfig?.categories && currentConfig.categories.length > 0 && (
                    <li>Категорий: <strong>{currentConfig.categories.length}</strong></li>
                  )}
                  {currentConfig?.accounts && currentConfig.accounts.length > 0 && (
                    <li>Счетов: <strong>{currentConfig.accounts.length}</strong></li>
                  )}
                </ul>
              </div>
              <div className={styles.formGroup}>
                <label>Название отчёта</label>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm({...saveForm, name: e.target.value})}
                  placeholder="Напр., Расходы за октябрь"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Категория</label>
                <select
                  value={saveForm.category}
                  onChange={(e) => setSaveForm({...saveForm, category: e.target.value})}
                  className={styles.input}
                >
                  <option>Пользовательские</option>
                  <option>Финансовые отчеты</option>
                  <option>Доходы/Расходы</option>
                  <option>Отчеты по картам</option>
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setShowSaveModal(false)}>
                Отмена
              </button>
              <button className={styles.btnPrimary} onClick={handleSaveReport}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
