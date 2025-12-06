'use client';

import { useState, useMemo } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import type { ExpensesReportData } from '@/lib/tenders/expenses-report-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Props {
  initialData: ExpensesReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'tenders' | 'executors' | 'dynamics';

export default function ExpensesReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<ExpensesReportData>(initialData);
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
      const response = await fetch(`/api/tenders/expenses-report?${params}`);
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
      ['Отчёт по расходам'], [],
      ['Показатель', 'Значение'],
      ['Всего расходов', data.overview.totalCosts.toString()],
      ['Закупка', data.overview.purchaseCosts.toString()],
      ['Логистика', data.overview.logisticsCosts.toString()],
      ['Прочие', data.overview.otherCosts.toString()],
      ['Обеспечение', data.overview.securityCosts.toString()],
      ['Сумма контрактов', data.overview.totalContractValue.toString()],
      ['Прибыль', data.overview.totalProfit.toString()],
      ['Маржа %', `${data.overview.profitMargin.toFixed(1)}%`], [],
      ['Тендеры'], ['Номер', 'Заказчик', 'Сумма контракта', 'Закупка', 'Логистика', 'Прочие', 'Всего расходов', 'Маржа %'],
      ...data.tenders.map(t => [t.purchaseNumber, t.customer, t.contractPrice.toString(), t.purchaseCost.toString(), t.logisticsCost.toString(), t.otherCosts.toString(), t.totalCosts.toString(), `${t.profitMargin.toFixed(1)}%`]),
    ];
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const categoriesChartData = useMemo(() => ({
    labels: data.categories.map(c => c.name),
    datasets: [{ data: data.categories.map(c => c.amount), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'], borderWidth: 0 }],
  }), [data.categories]);

  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      { label: 'Закупка', data: data.monthly.map(m => m.purchaseCosts), backgroundColor: '#3b82f6', stack: 'costs' },
      { label: 'Логистика', data: data.monthly.map(m => m.logisticsCosts), backgroundColor: '#10b981', stack: 'costs' },
      { label: 'Прочие', data: data.monthly.map(m => m.otherCosts), backgroundColor: '#f59e0b', stack: 'costs' },
    ],
  }), [data.monthly]);

  const marginChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [{ label: 'Маржинальность %', data: data.monthly.map(m => m.profitMargin), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 }],
  }), [data.monthly]);

  const { overview } = data;

  const costItems = [
    { name: 'Закупка', value: overview.purchaseCosts, color: '#3b82f6' },
    { name: 'Логистика', value: overview.logisticsCosts, color: '#10b981' },
    { name: 'Прочие', value: overview.otherCosts, color: '#f59e0b' },
    { name: 'Обеспечение', value: overview.securityCosts, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">💸 Расходы по тендерам</h1>
          <p className="text-gray-500 mt-1">Анализ затрат и маржинальности</p>
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
        <Card className="border-l-4 border-l-red-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">💰</span><div><div className="text-xl font-bold text-red-600">{formatCurrency(overview.totalCosts)}</div><div className="text-sm text-gray-500">Всего расходов</div><div className="text-xs text-gray-400">{overview.tendersCount} тендеров</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">📋</span><div><div className="text-xl font-bold">{formatCurrency(overview.totalContractValue)}</div><div className="text-sm text-gray-500">Сумма контрактов</div><div className="text-xs text-gray-400">Выручка</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">📈</span><div><div className="text-xl font-bold text-green-600">{formatCurrency(overview.totalProfit)}</div><div className="text-sm text-gray-500">Прибыль</div><div className="text-xs text-gray-400"><strong>{overview.profitMargin.toFixed(1)}%</strong> маржа</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">📊</span><div><div className="text-xl font-bold">{formatCurrency(overview.avgCostPerTender)}</div><div className="text-sm text-gray-500">Ср. расход</div><div className="text-xs text-gray-400">на 1 тендер</div></div></CardContent></Card>
      </div>

      {/* Cost Structure */}
      <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 Структура расходов</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{costItems.map(item => <div key={item.name} className="space-y-2"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: item.color }} /><span className="text-sm">{item.name}</span></div><div className="font-semibold">{formatCurrency(item.value)}</div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: overview.totalCosts > 0 ? `${(item.value / overview.totalCosts) * 100}%` : '0%', background: item.color }} /></div><div className="text-xs text-gray-500">{overview.totalCosts > 0 ? ((item.value / overview.totalCosts) * 100).toFixed(1) : 0}%</div></div>)}</div></CardContent></Card>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">📦</span><div><div className="font-bold">{formatCurrency(overview.purchaseCosts)}</div><div className="text-xs text-gray-500">Закупка товаров</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">🚚</span><div><div className="font-bold">{formatCurrency(overview.logisticsCosts)}</div><div className="text-xs text-gray-500">Логистика</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">🔧</span><div><div className="font-bold">{formatCurrency(overview.otherCosts)}</div><div className="text-xs text-gray-500">Прочие расходы</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg">🔒</span><div><div className="font-bold">{formatCurrency(overview.securityCosts)}</div><div className="text-xs text-gray-500">Обеспечение</div></div></CardContent></Card>
      </div>

      {/* Alerts */}
      {(data.topExpensiveTenders.length > 0 || data.lowMarginTenders.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.topExpensiveTenders.length > 0 && (
            <Alert><AlertDescription><h4 className="font-semibold mb-2">💰 Топ затратных тендеров</h4><div className="space-y-2">{data.topExpensiveTenders.map(item => <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded"><div><span className="font-medium">{item.purchaseNumber}</span><div className="text-xs text-gray-500 truncate max-w-[200px]">{item.customer}</div></div><div className="text-right"><Badge variant="outline">{formatCurrency(item.totalCosts)}</Badge><div className="text-xs mt-1">Маржа: {item.profitMargin.toFixed(1)}%</div></div></div>)}</div></AlertDescription></Alert>
          )}
          {data.lowMarginTenders.length > 0 && (
            <Alert variant="destructive"><AlertDescription><h4 className="font-semibold mb-2">⚠️ Низкая маржинальность</h4><div className="space-y-2">{data.lowMarginTenders.map(item => <div key={item.id} className="flex justify-between items-center p-2 bg-red-50 rounded"><div><span className="font-medium">{item.purchaseNumber}</span><div className="text-xs text-gray-600 truncate max-w-[200px]">{item.customer}</div></div><div className="text-right"><Badge variant="destructive">{item.profitMargin.toFixed(1)}%</Badge><div className="text-xs mt-1">{formatCurrency(item.contractPrice)}</div></div></div>)}</div></AlertDescription></Alert>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}>📊 Обзор</Button>
        <Button variant={activeTab === 'tenders' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('tenders')}>📋 Тендеры</Button>
        <Button variant={activeTab === 'executors' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('executors')}>👤 Исполнители</Button>
        <Button variant={activeTab === 'dynamics' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('dynamics')}>📈 Динамика</Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 Структура расходов</h3>{data.categories.length > 0 ? <div className="h-48"><Doughnut data={categoriesChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.raw as number)}` } } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💵 Финансовые показатели</h3><div className="space-y-4"><div><div className="flex justify-between text-sm mb-1"><span>Выручка (контракты)</span><span className="font-semibold">{formatCurrency(overview.totalContractValue)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-gray-400 rounded-full" style={{ width: '100%' }} /></div></div><div><div className="flex justify-between text-sm mb-1"><span>Расходы</span><span className="font-semibold text-red-600">{formatCurrency(overview.totalCosts)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${overview.costToRevenueRatio}%` }} /></div></div><div><div className="flex justify-between text-sm mb-1"><span>Прибыль</span><span className="font-semibold text-green-600">{formatCurrency(overview.totalProfit)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${overview.profitMargin}%` }} /></div></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🏢 Топ заказчиков по расходам</h3>{data.customers.length > 0 ? <div className="space-y-3">{data.customers.slice(0, 5).map((customer, idx) => <div key={customer.customer} className="flex items-center gap-3"><Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">{idx + 1}</Badge><div className="flex-1 min-w-0"><div className="font-medium truncate">{customer.customer}</div><div className="text-xs text-gray-500">{customer.tendersCount} тендеров · Маржа: {customer.profitMargin.toFixed(1)}%</div></div><div className="font-semibold text-sm">{formatCurrency(customer.totalCosts)}</div></div>)}</div> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Ключевые показатели</h3><div className="grid grid-cols-2 gap-4"><div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-2xl font-bold text-green-600">{overview.profitMargin.toFixed(1)}%</div><div className="text-xs text-gray-500">Маржа</div></div><div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-2xl font-bold text-red-600">{overview.costToRevenueRatio.toFixed(1)}%</div><div className="text-xs text-gray-500">Расходы/Выручка</div></div><div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-lg font-bold">{formatCurrency(overview.avgCostPerTender)}</div><div className="text-xs text-gray-500">Ср. расход</div></div><div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-lg font-bold text-green-600">{formatCurrency(overview.avgProfitPerTender)}</div><div className="text-xs text-gray-500">Ср. прибыль</div></div></div></CardContent></Card>
        </div>
      )}

      {activeTab === 'tenders' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">📋 Расходы по тендерам</h3></div>{data.tenders.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Номер закупки</th><th className="text-left p-3 font-medium">Заказчик</th><th className="text-right p-3 font-medium">Контракт</th><th className="text-right p-3 font-medium">Закупка</th><th className="text-right p-3 font-medium">Логистика</th><th className="text-right p-3 font-medium">Прочие</th><th className="text-right p-3 font-medium">Всего</th><th className="text-right p-3 font-medium">Маржа</th><th className="text-left p-3 font-medium">Исполнитель</th></tr></thead><tbody>{data.tenders.map(tender => <tr key={tender.id} className={`border-b hover:bg-gray-50 ${tender.profitMargin < 10 ? 'bg-red-50' : tender.profitMargin < 20 ? 'bg-amber-50' : ''}`}><td className="p-3 font-medium">{tender.purchaseNumber}</td><td className="p-3 truncate max-w-[200px]">{tender.customer}</td><td className="p-3 text-right font-semibold">{formatCurrency(tender.contractPrice)}</td><td className="p-3 text-right text-blue-600">{formatCurrency(tender.purchaseCost)}</td><td className="p-3 text-right text-green-600">{formatCurrency(tender.logisticsCost)}</td><td className="p-3 text-right text-amber-600">{formatCurrency(tender.otherCosts)}</td><td className="p-3 text-right"><Badge variant="destructive">{formatCurrency(tender.totalCosts)}</Badge></td><td className="p-3 text-right"><Badge className={tender.profitMargin >= 30 ? 'bg-green-500' : tender.profitMargin >= 15 ? 'bg-amber-500' : 'bg-red-500'}>{tender.profitMargin.toFixed(1)}%</Badge></td><td className="p-3">{tender.executor || <span className="text-gray-400">—</span>}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет тендеров с расходами</div>}</CardContent></Card>
      )}

      {activeTab === 'executors' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">👤 Расходы по исполнителям</h3></div>{data.executors.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-center p-3 font-medium w-12">#</th><th className="text-left p-3 font-medium">Исполнитель</th><th className="text-right p-3 font-medium">Тендеров</th><th className="text-right p-3 font-medium">Закупка</th><th className="text-right p-3 font-medium">Логистика</th><th className="text-right p-3 font-medium">Прочие</th><th className="text-right p-3 font-medium">Всего</th><th className="text-right p-3 font-medium">Контракты</th><th className="text-right p-3 font-medium">Маржа</th></tr></thead><tbody>{data.executors.map((exec, idx) => <tr key={exec.executor} className="border-b hover:bg-gray-50"><td className="p-3 text-center"><Badge variant="outline">{idx + 1}</Badge></td><td className="p-3 font-medium">{exec.executor}</td><td className="p-3 text-right">{exec.tendersCount}</td><td className="p-3 text-right text-blue-600">{formatCurrency(exec.purchaseCosts)}</td><td className="p-3 text-right text-green-600">{formatCurrency(exec.logisticsCosts)}</td><td className="p-3 text-right text-amber-600">{formatCurrency(exec.otherCosts)}</td><td className="p-3 text-right font-bold">{formatCurrency(exec.totalCosts)}</td><td className="p-3 text-right">{formatCurrency(exec.totalContractValue)}</td><td className="p-3 text-right"><Badge className={exec.profitMargin >= 30 ? 'bg-green-500' : exec.profitMargin >= 15 ? 'bg-amber-500' : 'bg-red-500'}>{exec.profitMargin.toFixed(1)}%</Badge></td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет данных по исполнителям</div>}</CardContent></Card>
      )}

      {activeTab === 'dynamics' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 Динамика расходов по месяцам</h3><div className="h-64"><Bar data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw as number)}` } } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }} /></div></CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Динамика маржинальности</h3><div className="h-64"><Line data={marginChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true, max: 100 } } }} /></div></CardContent></Card>
          <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">📅 Детализация по месяцам</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Месяц</th><th className="text-right p-3 font-medium">Закупка</th><th className="text-right p-3 font-medium">Логистика</th><th className="text-right p-3 font-medium">Прочие</th><th className="text-right p-3 font-medium">Всего</th><th className="text-right p-3 font-medium">Контракты</th><th className="text-right p-3 font-medium">Маржа</th></tr></thead><tbody>{data.monthly.map(month => <tr key={month.month} className="border-b"><td className="p-3 font-medium">{month.monthLabel}</td><td className="p-3 text-right text-blue-600">{formatCurrency(month.purchaseCosts)}</td><td className="p-3 text-right text-green-600">{formatCurrency(month.logisticsCosts)}</td><td className="p-3 text-right text-amber-600">{formatCurrency(month.otherCosts)}</td><td className="p-3 text-right font-bold">{formatCurrency(month.totalCosts)}</td><td className="p-3 text-right">{formatCurrency(month.contractValue)}</td><td className="p-3 text-right"><Badge className={month.profitMargin >= 30 ? 'bg-green-500' : month.profitMargin >= 15 ? 'bg-amber-500' : 'bg-red-500'}>{month.profitMargin.toFixed(1)}%</Badge></td></tr>)}</tbody></table></div></CardContent></Card>
        </div>
      )}

      {/* Insights */}
      <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💡 Аналитические выводы</h3><div className="space-y-2 text-sm">{overview.tendersCount > 0 ? (<><div className="flex items-center gap-2"><span>{overview.profitMargin >= 25 ? '🏆' : overview.profitMargin >= 15 ? '📈' : '⚠️'}</span><span>Маржинальность <strong>{overview.profitMargin.toFixed(1)}%</strong> — {overview.profitMargin >= 25 ? 'отличный показатель!' : overview.profitMargin >= 15 ? 'хороший результат' : 'требует оптимизации'}</span></div><div className="flex items-center gap-2"><span>📊</span><span>Расходы составляют <strong>{overview.costToRevenueRatio.toFixed(1)}%</strong> от выручки</span></div><div className="flex items-center gap-2"><span>📦</span><span>Основная статья: <strong>Закупка</strong> — {overview.totalCosts > 0 ? ((overview.purchaseCosts / overview.totalCosts) * 100).toFixed(0) : 0}% всех расходов</span></div>{data.lowMarginTenders.length > 0 && <div className="flex items-center gap-2 text-amber-600"><span>⚠️</span><span><strong>{data.lowMarginTenders.length}</strong> тендеров с низкой маржинальностью</span></div>}<div className="flex items-center gap-2"><span>💰</span><span>Средняя прибыль на тендер: <strong>{formatCurrency(overview.avgProfitPerTender)}</strong></span></div></>) : <div className="flex items-center gap-2"><span>📭</span><span>Нет данных за выбранный период</span></div>}</div></CardContent></Card>
    </div>
  );
}
