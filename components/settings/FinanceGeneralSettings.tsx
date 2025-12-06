"use client";

import { useState } from "react";
import type { CategoryRecord } from "./CategoriesManager";
import type { FinanceSettings } from "@/types/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PieChart, Receipt, Bell, BarChart3, Palette, Sparkles, Loader2, Check, AlertTriangle } from "lucide-react";

interface Props {
  categories: CategoryRecord[];
  settings: FinanceSettings;
  onSave: (settings: FinanceSettings) => Promise<void>;
}

export default function FinanceGeneralSettings({ categories, settings, onSave }: Props) {
  // Основные
  
  // Настройки бюджета
  const [budgetPeriod, setBudgetPeriod] = useState(settings.budgetPeriod || "month");
  const [budgetWarningType, setBudgetWarningType] = useState(settings.budgetWarningType || "percent");
  const [budgetWarningValue, setBudgetWarningValue] = useState(settings.budgetWarningValue || 90);
  
  // Транзакции
  const [showTransfersInStats, setShowTransfersInStats] = useState(settings.showTransfersInStats ?? true);
  const [autoDetectDuplicates, setAutoDetectDuplicates] = useState(settings.autoDetectDuplicates ?? true);
  const [recentTransactionsDays, setRecentTransactionsDays] = useState(settings.recentTransactionsDays || 7);
  
  // Уведомления
  const [notifyBudgetExceed, setNotifyBudgetExceed] = useState(settings.notifyBudgetExceed ?? true);
  const [remindRecurringDays, setRemindRecurringDays] = useState(settings.remindRecurringDays || 3);
  const [weeklySummary, setWeeklySummary] = useState(settings.weeklySummary ?? false);
  const [weeklySummaryDay, setWeeklySummaryDay] = useState(settings.weeklySummaryDay || "monday");
  
  // Отчеты
  const [defaultReportPeriod, setDefaultReportPeriod] = useState(settings.defaultReportPeriod || "month");
  const [excludeCategories, setExcludeCategories] = useState<string[]>(settings.excludeCategories || []);
  const [chartGrouping, setChartGrouping] = useState(settings.chartGrouping || "days");
  
  // Интерфейс
  const [showZeroBalances, setShowZeroBalances] = useState(settings.showZeroBalances ?? true);
  const [groupTransactionsByDate, setGroupTransactionsByDate] = useState(settings.groupTransactionsByDate ?? true);
  const [dashboardAccounts, setDashboardAccounts] = useState(settings.dashboardAccounts || "all");
  const [chartColorScheme, setChartColorScheme] = useState(settings.chartColorScheme || "standard");
  
  // Автоматизация
  const [autoCategorizationEnabled, setAutoCategorizationEnabled] = useState(settings.autoCategorizationEnabled ?? true);
  const [autoRecurringEnabled, setAutoRecurringEnabled] = useState(settings.autoRecurringEnabled ?? true);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      await onSave({
        budgetPeriod,
        budgetWarningType,
        budgetWarningValue,
        showTransfersInStats,
        autoDetectDuplicates,
        recentTransactionsDays,
        notifyBudgetExceed,
        remindRecurringDays,
        weeklySummary,
        weeklySummaryDay,
        defaultReportPeriod,
        excludeCategories,
        chartGrouping,
        showZeroBalances,
        groupTransactionsByDate,
        dashboardAccounts,
        chartColorScheme,
        autoCategorizationEnabled,
        autoRecurringEnabled,
      });
      
      setMessage("Настройки сохранены");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const toggleExcludeCategory = (categoryId: string) => {
    setExcludeCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <div className="space-y-8">
      {/* Бюджет */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <PieChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold">Настройки бюджета</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Период бюджета</Label>
            <Select value={budgetPeriod} onValueChange={setBudgetPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Месяц</SelectItem>
                <SelectItem value="quarter">Квартал</SelectItem>
                <SelectItem value="year">Год</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Тип предупреждения</Label>
            <Select value={budgetWarningType} onValueChange={setBudgetWarningType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Процент (%)</SelectItem>
                <SelectItem value="amount">Сумма (₽)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Значение ({budgetWarningType === "percent" ? "%" : "₽"})</Label>
            <Input type="number" value={budgetWarningValue} onChange={(e) => setBudgetWarningValue(Number(e.target.value))} min={0} max={budgetWarningType === "percent" ? 100 : undefined} />
          </div>
        </div>
      </section>

      {/* Транзакции */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="font-semibold">Транзакции</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
              <Checkbox checked={showTransfersInStats} onCheckedChange={(c) => setShowTransfersInStats(!!c)} />
              <span className="text-sm">Показывать переводы в статистике</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
              <Checkbox checked={autoDetectDuplicates} onCheckedChange={(c) => setAutoDetectDuplicates(!!c)} />
              <span className="text-sm">Автоопределение дубликатов</span>
            </label>
          </div>
          <div className="space-y-2 max-w-xs">
            <Label className="text-muted-foreground">Период недавних транзакций</Label>
            <Select value={String(recentTransactionsDays)} onValueChange={(v) => setRecentTransactionsDays(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 дней</SelectItem>
                <SelectItem value="14">14 дней</SelectItem>
                <SelectItem value="30">30 дней</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Уведомления */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="font-semibold">Уведомления</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
              <Checkbox checked={notifyBudgetExceed} onCheckedChange={(c) => setNotifyBudgetExceed(!!c)} />
              <span className="text-sm">Уведомлять о превышении бюджета</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
              <Checkbox checked={weeklySummary} onCheckedChange={(c) => setWeeklySummary(!!c)} />
              <span className="text-sm">Еженедельная сводка</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Напоминать о платежах за</Label>
              <Select value={String(remindRecurringDays)} onValueChange={(v) => setRemindRecurringDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 день</SelectItem>
                  <SelectItem value="3">3 дня</SelectItem>
                  <SelectItem value="7">7 дней</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {weeklySummary && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">День еженедельной сводки</Label>
                <Select value={weeklySummaryDay} onValueChange={setWeeklySummaryDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Понедельник</SelectItem>
                    <SelectItem value="tuesday">Вторник</SelectItem>
                    <SelectItem value="wednesday">Среда</SelectItem>
                    <SelectItem value="thursday">Четверг</SelectItem>
                    <SelectItem value="friday">Пятница</SelectItem>
                    <SelectItem value="saturday">Суббота</SelectItem>
                    <SelectItem value="sunday">Воскресенье</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Отчеты */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="font-semibold">Отчёты и аналитика</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Период по умолчанию</Label>
              <Select value={defaultReportPeriod} onValueChange={setDefaultReportPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Неделя</SelectItem>
                  <SelectItem value="month">Месяц</SelectItem>
                  <SelectItem value="quarter">Квартал</SelectItem>
                  <SelectItem value="year">Год</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Группировка данных</Label>
              <Select value={chartGrouping} onValueChange={setChartGrouping}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">По дням</SelectItem>
                  <SelectItem value="weeks">По неделям</SelectItem>
                  <SelectItem value="months">По месяцам</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Исключить из отчётов</Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/20">
              {categories.length > 0 ? categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border text-sm cursor-pointer hover:bg-muted transition-colors">
                  <Checkbox checked={excludeCategories.includes(c.id)} onCheckedChange={() => toggleExcludeCategory(c.id)} className="h-3.5 w-3.5" />
                  {c.name}
                </label>
              )) : <span className="text-sm text-muted-foreground">Нет категорий</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Интерфейс */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
            <Palette className="h-4 w-4 text-pink-600 dark:text-pink-400" />
          </div>
          <h3 className="font-semibold">Интерфейс</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
              <Checkbox checked={showZeroBalances} onCheckedChange={(c) => setShowZeroBalances(!!c)} />
              <span className="text-sm">Показывать нулевые балансы</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
              <Checkbox checked={groupTransactionsByDate} onCheckedChange={(c) => setGroupTransactionsByDate(!!c)} />
              <span className="text-sm">Группировать транзакции по дате</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Счета на главной</Label>
              <Select value={dashboardAccounts} onValueChange={setDashboardAccounts}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все счета</SelectItem>
                  <SelectItem value="favorites">Только избранные</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Цветовая схема графиков</Label>
              <Select value={chartColorScheme} onValueChange={setChartColorScheme}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Стандартная</SelectItem>
                  <SelectItem value="pastel">Пастельная</SelectItem>
                  <SelectItem value="bright">Яркая</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Автоматизация */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
            <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h3 className="font-semibold">Автоматизация</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
            <Checkbox checked={autoCategorizationEnabled} onCheckedChange={(c) => setAutoCategorizationEnabled(!!c)} />
            <div>
              <span className="text-sm font-medium block">Автокатегоризация</span>
              <span className="text-xs text-muted-foreground">AI автоматически определит категорию</span>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
            <Checkbox checked={autoRecurringEnabled} onCheckedChange={(c) => setAutoRecurringEnabled(!!c)} />
            <div>
              <span className="text-sm font-medium block">Регулярные платежи</span>
              <span className="text-xs text-muted-foreground">Автосоздание повторяющихся операций</span>
            </div>
          </label>
        </div>
      </section>

      {/* Сохранение */}
      <div className="flex items-center gap-4 pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</> : 'Сохранить изменения'}
        </Button>
        {message && (
          <span className={`text-sm flex items-center gap-2 px-3 py-2 rounded-lg ${message.includes("Ошибка") ? "bg-destructive/10 text-destructive" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
            {message.includes("Ошибка") ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
