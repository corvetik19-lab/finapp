'use client';

import { useState, useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import type { RealizationReportData } from '@/lib/tenders/realization-report-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Props {
  initialData: RealizationReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'executors' | 'customers' | 'dynamics';

export default function RealizationReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<RealizationReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)} млрд ₽`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} млн ₽`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)} тыс ₽`;
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount);
  };

  const handlePeriodChange = async (newPeriod: Period) => {
    setPeriod(newPeriod);
    setLoading(true);
    try {
      const now = new Date();
      let dateFrom: string | undefined;
      if (newPeriod === 'month') dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      else if (newPeriod === 'quarter') dateFrom = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
      else if (newPeriod === 'year') dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const params = new URLSearchParams({ company_id: companyId });
      if (dateFrom) params.append('date_from', dateFrom);
      const response = await fetch(`/api/tenders/realization-report?${params}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) setData(result.data);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ['Отчёт по реализации'], [],
      ['Показатель', 'Значение'],
      ['Всего контрактов', data.overview.totalContracts.toString()],
      ['Активных', data.overview.activeContracts.toString()],
      ['Завершённых', data.overview.completedContracts.toString()],
      ['Проблемных', data.overview.problemContracts.toString()],
      ['% выполнения', `${data.overview.completionRate.toFixed(1)}%`],
      ['Общая сумма', data.overview.totalContractValue.toString()],
      ['Выполнено на сумму', data.overview.completedValue.toString()],
      ['Ср. срок выполнения', `${data.overview.avgCompletionDays} дней`], [],
      ['Исполнители'], ['Имя', 'Всего', 'Активных', 'Завершено', '% выполнения', 'Сумма'],
      ...data.executors.map(e => [e.name, e.totalContracts.toString(), e.activeContracts.toString(), e.completedContracts.toString(), `${e.completionRate.toFixed(1)}%`, e.totalValue.toString()]), [],
      ['По этапам'], ['Этап', 'Количество', '%', 'Сумма'],
      ...data.stages.map(s => [s.stageName, s.count.toString(), `${s.percent.toFixed(1)}%`, s.totalValue.toString()]),
    ];
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `realization-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      { label: 'Начато', data: data.monthly.map(m => m.started), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
      { label: 'Завершено', data: data.monthly.map(m => m.completed), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
    ],
  }), [data.monthly]);

  const stagesChartData = useMemo(() => ({
    labels: data.stages.map(s => s.stageName),
    datasets: [{ data: data.stages.map(s => s.count), backgroundColor: data.stages.map(s => s.stageColor || '#6b7280'), borderWidth: 0 }],
  }), [data.stages]);

  const completionChartData = useMemo(() => ({
    labels: ['Завершено', 'В работе', 'Проблемные'],
    datasets: [{ data: [data.overview.completedContracts, data.overview.activeContracts - data.overview.problemContracts, data.overview.problemContracts], backgroundColor: ['#10b981', '#3b82f6', '#ef4444'], borderWidth: 0 }],
  }), [data.overview]);

  const { overview, timing } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📦 Отчёт по реализации</h1>
          <p className="text-gray-500 mt-1">Исполнение контрактов и контроль сроков</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['month', 'quarter', 'year', 'all'] as Period[]).map(p => (
              <Button key={p} variant={period === p ? 'default' : 'ghost'} size="sm" onClick={() => handlePeriodChange(p)} disabled={loading}>
                {p === 'month' ? 'Месяц' : p === 'quarter' ? 'Квартал' : p === 'year' ? 'Год' : 'Всё время'}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Экспорт</Button>
        </div>
      </div>

      {loading && <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">📋</span><div><div className="text-xl font-bold">{overview.totalContracts}</div><div className="text-sm text-gray-500">Всего контрактов</div><div className="text-xs text-gray-400">В работе: {overview.activeContracts}</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">✅</span><div><div className="text-xl font-bold text-green-600">{overview.completedContracts}</div><div className="text-sm text-gray-500">Завершено</div><div className="text-xs text-gray-400"><strong>{overview.completionRate.toFixed(1)}%</strong> выполнено</div></div></CardContent></Card>
        <Card className={`border-l-4 ${overview.problemContracts > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">{overview.problemContracts > 0 ? '⚠️' : '👍'}</span><div><div className={`text-xl font-bold ${overview.problemContracts > 0 ? 'text-red-600' : 'text-green-600'}`}>{overview.problemContracts}</div><div className="text-sm text-gray-500">Проблемных</div><div className="text-xs text-gray-400">{overview.problemContracts > 0 ? 'Требуют внимания' : 'Всё в порядке'}</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">💰</span><div><div className="text-xl font-bold text-purple-600">{formatCurrency(overview.totalContractValue)}</div><div className="text-sm text-gray-500">Общая сумма</div><div className="text-xs text-gray-400">Выполнено: {formatCurrency(overview.completedValue)}</div></div></CardContent></Card>
      </div>

      {/* Progress */}
      <Card><CardContent className="p-4"><div className="flex justify-between items-center mb-2"><h3 className="font-semibold">📊 Прогресс выполнения</h3><span className="text-xl font-bold">{overview.completionRate.toFixed(1)}%</span></div><div className="h-4 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${overview.completionRate}%`, background: overview.completionRate >= 70 ? '#10b981' : overview.completionRate >= 40 ? '#f59e0b' : '#ef4444' }} /></div><div className="flex gap-6 mt-3 text-sm"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" />Завершено: {overview.completedContracts}</div><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" />В работе: {overview.activeContracts - overview.problemContracts}</div><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" />Проблемные: {overview.problemContracts}</div></div></CardContent></Card>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">⏱️</span><div><div className="font-bold">{overview.avgCompletionDays} дн</div><div className="text-xs text-gray-500">Ср. срок выполнения</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">👤</span><div><div className="font-bold">{data.executors.length}</div><div className="text-xs text-gray-500">Исполнителей</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">🏢</span><div><div className="font-bold">{data.customers.length}</div><div className="text-xs text-gray-500">Заказчиков</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${timing.onTimePercent >= 80 ? 'bg-green-100' : 'bg-red-100'}`}>{timing.onTimePercent >= 80 ? '✅' : '⚠️'}</span><div><div className="font-bold">{timing.onTimePercent.toFixed(0)}%</div><div className="text-xs text-gray-500">В срок</div></div></CardContent></Card>
      </div>

      {/* Alerts */}
      {(data.upcomingDeadlines.length > 0 || data.problemContracts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.upcomingDeadlines.length > 0 && (
            <Alert><AlertDescription><h4 className="font-semibold mb-2">⏰ Скоро дедлайны ({data.upcomingDeadlines.length})</h4><div className="space-y-2">{data.upcomingDeadlines.slice(0, 5).map(item => <div key={item.id} className="flex justify-between items-center p-2 bg-amber-50 rounded"><div><span className="font-medium">{item.purchaseNumber}</span><div className="text-xs text-gray-500">{item.customer}</div></div><div className="text-right"><Badge className={item.urgency === 'critical' ? 'bg-red-500' : item.urgency === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}>{item.daysLeft === 0 ? 'Сегодня' : item.daysLeft === 1 ? 'Завтра' : `${item.daysLeft} дн`}</Badge><div className="text-xs font-medium mt-1">{formatCurrency(item.value)}</div></div></div>)}</div></AlertDescription></Alert>
          )}
          {data.problemContracts.length > 0 && (
            <Alert variant="destructive"><AlertDescription><h4 className="font-semibold mb-2">🚨 Просрочено ({data.problemContracts.length})</h4><div className="space-y-2">{data.problemContracts.slice(0, 5).map(item => <div key={item.id} className="flex justify-between items-center p-2 bg-red-50 rounded"><div><span className="font-medium">{item.purchaseNumber}</span><div className="text-xs text-gray-600">{item.customer}</div></div><div className="text-right"><Badge variant="destructive">+{item.daysOverdue} дн</Badge><div className="text-xs font-medium mt-1">{formatCurrency(item.value)}</div></div></div>)}</div></AlertDescription></Alert>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}>📊 Обзор</Button>
        <Button variant={activeTab === 'executors' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('executors')}>👥 Исполнители</Button>
        <Button variant={activeTab === 'customers' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('customers')}>🏢 Заказчики</Button>
        <Button variant={activeTab === 'dynamics' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('dynamics')}>📈 Динамика</Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🎯 Распределение по этапам</h3>{data.stages.length > 0 ? <><div className="h-48"><Doughnut data={stagesChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } } }} /></div><div className="mt-3 space-y-2">{data.stages.map(stage => <div key={stage.stageId} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: stage.stageColor }} /><span>{stage.stageName}</span></div><div className="flex gap-3"><Badge variant="outline">{stage.count}</Badge><span className="text-gray-500">{formatCurrency(stage.totalValue)}</span></div></div>)}</div></> : <div className="text-center py-8 text-gray-500">Нет данных по этапам</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Статус контрактов</h3>{overview.totalContracts > 0 ? <div className="h-48"><Doughnut data={completionChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет активных контрактов</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💰 Финансовый прогресс</h3><div className="space-y-4"><div><div className="flex justify-between text-sm mb-1"><span>Общая сумма контрактов</span><span className="font-semibold">{formatCurrency(overview.totalContractValue)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} /></div></div><div><div className="flex justify-between text-sm mb-1"><span>Выполнено</span><span className="font-semibold text-green-600">{formatCurrency(overview.completedValue)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: overview.totalContractValue > 0 ? `${(overview.completedValue / overview.totalContractValue) * 100}%` : '0%' }} /></div></div><div><div className="flex justify-between text-sm mb-1"><span>Осталось выполнить</span><span className="font-semibold text-amber-600">{formatCurrency(overview.remainingValue)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: overview.totalContractValue > 0 ? `${(overview.remainingValue / overview.totalContractValue) * 100}%` : '0%' }} /></div></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">⏱️ Статистика по срокам</h3><div className="grid grid-cols-5 gap-2 text-center"><div className="p-2 bg-gray-50 rounded"><div className="text-lg font-bold">{timing.avgDaysToComplete}</div><div className="text-xs text-gray-500">Ср. дней</div></div><div className="p-2 bg-gray-50 rounded"><div className="text-lg font-bold">{timing.minDays}</div><div className="text-xs text-gray-500">Мин.</div></div><div className="p-2 bg-gray-50 rounded"><div className="text-lg font-bold">{timing.maxDays}</div><div className="text-xs text-gray-500">Макс.</div></div><div className="p-2 bg-green-50 rounded"><div className="text-lg font-bold text-green-600">{timing.onTimeCount}</div><div className="text-xs text-gray-500">В срок</div></div><div className="p-2 bg-red-50 rounded"><div className="text-lg font-bold text-red-600">{timing.lateCount}</div><div className="text-xs text-gray-500">Просрочено</div></div></div></CardContent></Card>
        </div>
      )}

      {activeTab === 'executors' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">👥 Показатели исполнителей</h3></div>{data.executors.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-center p-3 font-medium w-12">#</th><th className="text-left p-3 font-medium">Исполнитель</th><th className="text-left p-3 font-medium">Роль</th><th className="text-right p-3 font-medium">Всего</th><th className="text-right p-3 font-medium">Активных</th><th className="text-right p-3 font-medium">Завершено</th><th className="text-right p-3 font-medium">Проблемных</th><th className="text-right p-3 font-medium">% выполнения</th><th className="text-right p-3 font-medium">Сумма</th><th className="text-right p-3 font-medium">Ср. срок</th></tr></thead><tbody>{data.executors.map((exec, idx) => <tr key={exec.id} className="border-b hover:bg-gray-50"><td className="p-3 text-center"><Badge variant="outline">{idx + 1}</Badge></td><td className="p-3 font-medium">{exec.name}</td><td className="p-3"><Badge variant="secondary">{exec.role}</Badge></td><td className="p-3 text-right">{exec.totalContracts}</td><td className="p-3 text-right"><Badge variant="outline">{exec.activeContracts}</Badge></td><td className="p-3 text-right"><Badge className="bg-green-100 text-green-700">{exec.completedContracts}</Badge></td><td className="p-3 text-right">{exec.problemContracts > 0 ? <Badge variant="destructive">{exec.problemContracts}</Badge> : <span className="text-gray-400">0</span>}</td><td className="p-3 text-right"><Badge className={exec.completionRate >= 70 ? 'bg-green-500' : exec.completionRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}>{exec.completionRate.toFixed(0)}%</Badge></td><td className="p-3 text-right font-semibold">{formatCurrency(exec.totalValue)}</td><td className="p-3 text-right text-gray-500">{exec.avgDays} дн</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет данных по исполнителям</div>}</CardContent></Card>
      )}

      {activeTab === 'customers' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">🏢 Контракты по заказчикам</h3></div>{data.customers.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-center p-3 font-medium w-12">#</th><th className="text-left p-3 font-medium">Заказчик</th><th className="text-right p-3 font-medium">Всего</th><th className="text-right p-3 font-medium">Активных</th><th className="text-right p-3 font-medium">Завершено</th><th className="text-right p-3 font-medium">Общая сумма</th><th className="text-right p-3 font-medium">Выполнено</th></tr></thead><tbody>{data.customers.map((customer, idx) => <tr key={customer.name} className="border-b hover:bg-gray-50"><td className="p-3 text-center"><Badge variant="outline">{idx + 1}</Badge></td><td className="p-3 font-medium">{customer.name}</td><td className="p-3 text-right">{customer.count}</td><td className="p-3 text-right"><Badge variant="outline">{customer.activeCount}</Badge></td><td className="p-3 text-right"><Badge className="bg-green-100 text-green-700">{customer.completedCount}</Badge></td><td className="p-3 text-right font-semibold">{formatCurrency(customer.totalValue)}</td><td className="p-3 text-right font-semibold text-green-600">{formatCurrency(customer.completedValue)}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет данных по заказчикам</div>}</CardContent></Card>
      )}

      {activeTab === 'dynamics' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Динамика по месяцам</h3><div className="h-64"><Line data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} /></div></CardContent></Card>
          <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">📅 Детализация по месяцам</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Месяц</th><th className="text-right p-3 font-medium">Начато</th><th className="text-right p-3 font-medium">Завершено</th><th className="text-right p-3 font-medium">% выполнения</th><th className="text-right p-3 font-medium">Общая сумма</th><th className="text-right p-3 font-medium">Выполнено</th></tr></thead><tbody>{data.monthly.map(month => <tr key={month.month} className="border-b"><td className="p-3 font-medium">{month.monthLabel}</td><td className="p-3 text-right">{month.started}</td><td className="p-3 text-right"><Badge className="bg-green-100 text-green-700">{month.completed}</Badge></td><td className="p-3 text-right"><Badge className={month.completionRate >= 70 ? 'bg-green-500' : month.completionRate >= 40 ? 'bg-amber-500' : 'bg-red-500'}>{month.completionRate.toFixed(0)}%</Badge></td><td className="p-3 text-right font-semibold">{formatCurrency(month.totalValue)}</td><td className="p-3 text-right font-semibold text-green-600">{formatCurrency(month.completedValue)}</td></tr>)}</tbody></table></div></CardContent></Card>
        </div>
      )}

      {/* Insights */}
      <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💡 Аналитические выводы</h3><div className="space-y-2 text-sm">{overview.totalContracts > 0 ? (<><div className="flex items-center gap-2"><span>{overview.completionRate >= 70 ? '🏆' : overview.completionRate >= 40 ? '📈' : '⚠️'}</span><span>Процент выполнения <strong>{overview.completionRate.toFixed(1)}%</strong> — {overview.completionRate >= 70 ? 'отличный показатель!' : overview.completionRate >= 40 ? 'хороший результат' : 'требует внимания'}</span></div><div className="flex items-center gap-2"><span>⏱️</span><span>Средний срок выполнения: <strong>{overview.avgCompletionDays} дней</strong></span></div>{data.executors.length > 0 && <div className="flex items-center gap-2"><span>👤</span><span>Лучший исполнитель: <strong>{data.executors[0]?.name}</strong> ({data.executors[0]?.completedContracts} завершено, {data.executors[0]?.completionRate.toFixed(0)}%)</span></div>}{data.upcomingDeadlines.length > 0 && <div className="flex items-center gap-2 text-amber-600"><span>⏰</span><span><strong>{data.upcomingDeadlines.length}</strong> контрактов со скорым дедлайном</span></div>}{data.problemContracts.length > 0 && <div className="flex items-center gap-2 text-red-600"><span>🚨</span><span><strong>{data.problemContracts.length}</strong> просроченных контрактов требуют внимания!</span></div>}</>) : <div className="flex items-center gap-2"><span>📭</span><span>Нет данных за выбранный период</span></div>}</div></CardContent></Card>
    </div>
  );
}
