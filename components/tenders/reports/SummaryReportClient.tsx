'use client';

import { useState, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import type { SummaryReportData } from '@/lib/tenders/summary-report-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Props {
  initialData: SummaryReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';

export default function SummaryReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<SummaryReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel' | 'customers' | 'managers'>('overview');

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
      const response = await fetch(`/api/tenders/summary-report?${params}`);
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
      ['Сводный отчёт по тендерам'], [],
      ['Показатель', 'Значение'],
      ['Всего тендеров', data.overview.totalTenders.toString()],
      ['Активных', data.overview.activeTenders.toString()],
      ['Выигранных', data.overview.wonTenders.toString()],
      ['Проигранных', data.overview.lostTenders.toString()],
      ['Процент побед', `${data.overview.winRate.toFixed(1)}%`],
      ['Общая НМЦК', data.overview.totalNmck.toString()],
      ['Сумма контрактов', data.overview.totalContractPrice.toString()],
      ['Экономия', data.overview.totalSavings.toString()], [],
      ['Воронка продаж'], ['Этап', 'Количество', 'НМЦК'],
      ...data.funnel.map(f => [f.stageName, f.count.toString(), f.totalNmck.toString()]), [],
      ['Топ заказчиков'], ['Заказчик', 'Тендеров', 'НМЦК', 'Выиграно'],
      ...data.topCustomers.map(c => [c.customer, c.count.toString(), c.totalNmck.toString(), c.wonCount.toString()]),
    ];
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summary-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      { label: 'Всего тендеров', data: data.monthly.map(m => m.count), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
      { label: 'Выиграно', data: data.monthly.map(m => m.wonCount), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
    ],
  }), [data.monthly]);

  const typeChartData = useMemo(() => ({
    labels: data.byType.slice(0, 6).map(t => t.typeName),
    datasets: [{ data: data.byType.slice(0, 6).map(t => t.count), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'], borderWidth: 0 }],
  }), [data.byType]);

  const funnelChartData = useMemo(() => ({
    labels: data.funnel.map(f => f.stageName),
    datasets: [{ label: 'Количество', data: data.funnel.map(f => f.count), backgroundColor: data.funnel.map(f => f.stageColor || '#6b7280'), borderRadius: 8 }],
  }), [data.funnel]);

  const { overview, financial, timing } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📊 Сводный отчёт</h1>
          <p className="text-gray-500 mt-1">Ключевые показатели эффективности тендерной деятельности</p>
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
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">📋</span><div><div className="text-xl font-bold">{overview.totalTenders}</div><div className="text-sm text-gray-500">Всего тендеров</div><div className="text-xs text-gray-400">Активных: {overview.activeTenders}</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">🏆</span><div><div className="text-xl font-bold text-green-600">{overview.wonTenders}</div><div className="text-sm text-gray-500">Выиграно</div><div className="text-xs text-gray-400">Win Rate: <strong>{overview.winRate.toFixed(1)}%</strong></div></div></CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">💰</span><div><div className="text-xl font-bold text-purple-600">{formatCurrency(overview.totalNmck)}</div><div className="text-sm text-gray-500">Общая НМЦК</div><div className="text-xs text-gray-400">Контракты: {formatCurrency(overview.totalContractPrice)}</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">💎</span><div><div className="text-xl font-bold text-amber-600">{formatCurrency(overview.totalSavings)}</div><div className="text-sm text-gray-500">Экономия</div><div className="text-xs text-gray-400">{overview.savingsPercent.toFixed(1)}% от НМЦК</div></div></CardContent></Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-lg">❌</span><div><div className="font-bold">{overview.lostTenders}</div><div className="text-xs text-gray-500">Проиграно</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">📊</span><div><div className="font-bold">{formatCurrency(overview.avgDealSize)}</div><div className="text-xs text-gray-500">Средняя сделка</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">⏰</span><div><div className="font-bold">{timing.upcomingDeadlines}</div><div className="text-xs text-gray-500">Дедлайны на неделе</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-lg">🚨</span><div><div className="font-bold text-red-600">{timing.overdueCount}</div><div className="text-xs text-gray-500">Просрочено</div></div></CardContent></Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}>📈 Динамика</Button>
        <Button variant={activeTab === 'funnel' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('funnel')}>🎯 Воронка</Button>
        <Button variant={activeTab === 'customers' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('customers')}>🏢 Заказчики</Button>
        <Button variant={activeTab === 'managers' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('managers')}>👥 Менеджеры</Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Динамика по месяцам</h3><div className="h-64"><Line data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} /></div></CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 По типам тендеров</h3><div className="h-48"><Doughnut data={typeChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10 } } } }} /></div><div className="mt-3 space-y-1">{data.byType.slice(0, 5).map(type => <div key={type.typeId} className="flex justify-between text-sm"><span className="text-gray-600">{type.typeName}</span><span>{type.count} ({type.wonCount} выиграно)</span></div>)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🏪 По площадкам</h3>{data.byPlatform.length > 0 ? <div className="space-y-3">{data.byPlatform.map((platform, idx) => <div key={platform.platformId} className="flex items-center gap-3"><Badge variant="outline">{idx + 1}</Badge><div className="flex-1 min-w-0"><div className="font-medium truncate">{platform.platformName}</div><div className="text-xs text-gray-500">{platform.count} тендеров • {platform.wonCount} выиграно • {formatCurrency(platform.totalNmck)}</div></div><div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${data.byPlatform[0]?.count > 0 ? (platform.count / data.byPlatform[0].count) * 100 : 0}%` }} /></div></div>)}</div> : <div className="text-center py-8 text-gray-500">Нет данных по площадкам</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💵 Финансовый баланс</h3><div className="space-y-4"><div className="flex justify-between"><span className="text-gray-600">Доход (контракты)</span><span className="font-bold text-green-600">+{formatCurrency(financial.totalIncome)}</span></div><div className="flex justify-between"><span className="text-gray-600">Обеспечения</span><span className="font-bold text-red-600">-{formatCurrency(financial.totalExpenses)}</span></div><hr /><div className="flex justify-between"><span className="text-gray-600">Чистая прибыль</span><span className={`text-xl font-bold ${financial.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{financial.profit >= 0 ? '+' : ''}{formatCurrency(financial.profit)}</span></div><div className="text-sm text-gray-500 text-right">Маржа: {financial.profitMargin.toFixed(1)}%</div></div></CardContent></Card>
        </div>
      )}

      {activeTab === 'funnel' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🎯 Воронка продаж по этапам</h3><div className="h-64"><Bar data={funnelChartData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }} /></div></CardContent></Card>
          <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Этап</th><th className="text-right p-3 font-medium">Количество</th><th className="text-right p-3 font-medium">%</th><th className="text-right p-3 font-medium">НМЦК</th></tr></thead><tbody>{data.funnel.map(stage => <tr key={stage.stageId} className="border-b"><td className="p-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: stage.stageColor }} />{stage.stageName}</td><td className="p-3 text-right font-semibold">{stage.count}</td><td className="p-3 text-right">{stage.percent.toFixed(1)}%</td><td className="p-3 text-right">{formatCurrency(stage.totalNmck)}</td></tr>)}</tbody></table></div></CardContent></Card>
        </div>
      )}

      {activeTab === 'customers' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">🏢 Топ заказчиков</h3></div>{data.topCustomers.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-center p-3 font-medium w-12">#</th><th className="text-left p-3 font-medium">Заказчик</th><th className="text-right p-3 font-medium">Тендеров</th><th className="text-right p-3 font-medium">Выиграно</th><th className="text-right p-3 font-medium">Win Rate</th><th className="text-right p-3 font-medium">НМЦК</th><th className="text-right p-3 font-medium">Ср. сумма</th></tr></thead><tbody>{data.topCustomers.map((customer, idx) => <tr key={customer.customer} className="border-b hover:bg-gray-50"><td className="p-3 text-center"><Badge variant="outline">{idx + 1}</Badge></td><td className="p-3 font-medium">{customer.customer}</td><td className="p-3 text-right">{customer.count}</td><td className="p-3 text-right"><Badge className="bg-green-100 text-green-700">{customer.wonCount}</Badge></td><td className="p-3 text-right">{customer.count > 0 ? ((customer.wonCount / customer.count) * 100).toFixed(0) : 0}%</td><td className="p-3 text-right font-semibold">{formatCurrency(customer.totalNmck)}</td><td className="p-3 text-right text-gray-500">{formatCurrency(customer.avgNmck)}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет данных по заказчикам</div>}</CardContent></Card>
      )}

      {activeTab === 'managers' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">👥 Показатели менеджеров</h3></div>{data.topManagers.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-center p-3 font-medium w-12">#</th><th className="text-left p-3 font-medium">Менеджер</th><th className="text-right p-3 font-medium">Тендеров</th><th className="text-right p-3 font-medium">Выиграно</th><th className="text-right p-3 font-medium">Win Rate</th><th className="text-right p-3 font-medium">НМЦК</th></tr></thead><tbody>{data.topManagers.map((manager, idx) => <tr key={manager.managerId} className="border-b hover:bg-gray-50"><td className="p-3 text-center"><Badge variant="outline">{idx + 1}</Badge></td><td className="p-3 font-medium">{manager.managerName}</td><td className="p-3 text-right">{manager.count}</td><td className="p-3 text-right"><Badge className="bg-green-100 text-green-700">{manager.wonCount}</Badge></td><td className="p-3 text-right"><Badge className={manager.winRate >= 50 ? 'bg-green-500' : manager.winRate >= 30 ? 'bg-amber-500' : 'bg-red-500'}>{manager.winRate.toFixed(0)}%</Badge></td><td className="p-3 text-right font-semibold">{formatCurrency(manager.totalNmck)}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет данных по менеджерам</div>}</CardContent></Card>
      )}

      {/* Insights */}
      <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💡 Аналитические выводы</h3><div className="space-y-2 text-sm">{overview.totalTenders > 0 ? (<><div className="flex items-center gap-2"><span>📊</span><span>Общий объём: <strong>{overview.totalTenders} тендеров</strong> на сумму <strong>{formatCurrency(overview.totalNmck)}</strong></span></div><div className="flex items-center gap-2"><span>{overview.winRate >= 40 ? '🏆' : overview.winRate >= 20 ? '📈' : '⚠️'}</span><span>Win Rate <strong>{overview.winRate.toFixed(1)}%</strong> — {overview.winRate >= 40 ? 'отличный показатель!' : overview.winRate >= 20 ? 'хороший результат, есть потенциал' : 'требует внимания'}</span></div>{overview.totalSavings > 0 && <div className="flex items-center gap-2"><span>💰</span><span>Экономия при закупках: <strong>{formatCurrency(overview.totalSavings)}</strong> ({overview.savingsPercent.toFixed(1)}% от НМЦК)</span></div>}{data.topCustomers[0] && <div className="flex items-center gap-2"><span>🏢</span><span>Ключевой заказчик: <strong>{data.topCustomers[0].customer}</strong> ({data.topCustomers[0].count} тендеров, {formatCurrency(data.topCustomers[0].totalNmck)})</span></div>}{data.topManagers[0] && <div className="flex items-center gap-2"><span>👤</span><span>Лучший менеджер: <strong>{data.topManagers[0].managerName}</strong> ({data.topManagers[0].wonCount} побед, Win Rate {data.topManagers[0].winRate.toFixed(0)}%)</span></div>}{timing.upcomingDeadlines > 0 && <div className="flex items-center gap-2"><span>⏰</span><span><strong>{timing.upcomingDeadlines} тендеров</strong> с дедлайном на этой неделе</span></div>}{timing.overdueCount > 0 && <div className="flex items-center gap-2 text-red-600"><span>🚨</span><span><strong>{timing.overdueCount} просроченных</strong> тендеров требуют внимания!</span></div>}</>) : <div className="flex items-center gap-2"><span>📭</span><span>Нет данных за выбранный период</span></div>}</div></CardContent></Card>
    </div>
  );
}
