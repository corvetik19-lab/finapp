'use client';

import { useState, useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import type { GuaranteesReportData } from '@/lib/tenders/guarantees-report-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface Props {
  initialData: GuaranteesReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'all' | 'expiring';
type Filter = 'all' | 'active' | 'expiring' | 'expired';

export default function GuaranteesReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<GuaranteesReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filter, setFilter] = useState<Filter>('all');

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)} млрд ₽`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} млн ₽`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)} тыс ₽`;
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      const response = await fetch(`/api/tenders/guarantees-report?${params}`);
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
      ['Отчёт по банковским гарантиям'], [],
      ['Показатель', 'Значение'],
      ['Всего гарантий', data.overview.totalCount.toString()],
      ['Общая сумма', data.overview.totalAmount.toString()],
      ['Активных', data.overview.activeCount.toString()],
      ['Истекают скоро', data.overview.expiringCount.toString()],
      ['Истекли', data.overview.expiredCount.toString()], [],
      ['Гарантии'], ['Номер закупки', 'Заказчик', 'Тип', 'Сумма', 'Начало', 'Окончание', 'Дней осталось', 'Статус'],
      ...data.guarantees.map(g => [g.purchaseNumber, g.customer, g.type === 'application' ? 'Заявка' : g.type === 'contract' ? 'Контракт' : 'Гарантия', g.amount.toString(), g.startDate || '', g.endDate || '', g.daysLeft.toString(), g.status]),
    ];
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guarantees-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = { application: 'Обеспечение заявки', contract: 'Обеспечение контракта', warranty: 'Гарантийные обязательства' };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge className="bg-green-500">Активна</Badge>;
    if (status === 'expiring') return <Badge className="bg-amber-500">Истекает</Badge>;
    if (status === 'expired') return <Badge variant="destructive">Истекла</Badge>;
    if (status === 'returned') return <Badge variant="outline">Возвращена</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const filteredGuarantees = useMemo(() => {
    return data.guarantees.filter(g => {
      if (filter === 'active') return g.status === 'active';
      if (filter === 'expiring') return g.status === 'expiring' || (g.status === 'active' && g.daysLeft <= 30);
      if (filter === 'expired') return g.status === 'expired';
      return true;
    });
  }, [data.guarantees, filter]);

  const typeChartData = useMemo(() => ({
    labels: data.byType.map(t => t.label),
    datasets: [{ data: data.byType.map(t => t.amount), backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b'], borderWidth: 0 }],
  }), [data.byType]);

  const statusChartData = useMemo(() => ({
    labels: ['Активные', 'Истекают', 'Истекшие'],
    datasets: [{ data: [data.overview.activeCount, data.overview.expiringCount, data.overview.expiredCount], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }],
  }), [data.overview]);

  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [{ label: 'Новые гарантии', data: data.monthly.map(m => m.newAmount), backgroundColor: '#3b82f6' }],
  }), [data.monthly]);

  const { overview } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">🛡️ Банковские гарантии</h1>
          <p className="text-gray-500 mt-1">Обеспечение заявок и контрактов</p>
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
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">📋</span><div><div className="text-xl font-bold">{overview.totalCount}</div><div className="text-sm text-gray-500">Всего гарантий</div><div className="text-xs text-gray-400">{formatCurrency(overview.totalAmount)}</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">✅</span><div><div className="text-xl font-bold text-green-600">{overview.activeCount}</div><div className="text-sm text-gray-500">Активных</div><div className="text-xs text-gray-400">{formatCurrency(overview.activeAmount)}</div></div></CardContent></Card>
        <Card className={`border-l-4 ${overview.expiringCount > 0 ? 'border-l-amber-500' : 'border-l-green-500'}`}><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">{overview.expiringCount > 0 ? '⚠️' : '👍'}</span><div><div className={`text-xl font-bold ${overview.expiringCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>{overview.expiringCount}</div><div className="text-sm text-gray-500">Истекают</div><div className="text-xs text-gray-400">{overview.expiringCount > 0 ? formatCurrency(overview.expiringAmount) : 'Нет срочных'}</div></div></CardContent></Card>
        <Card className={`border-l-4 ${overview.expiredCount > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">{overview.expiredCount > 0 ? '❌' : '✅'}</span><div><div className={`text-xl font-bold ${overview.expiredCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{overview.expiredCount}</div><div className="text-sm text-gray-500">Истекли</div><div className="text-xs text-gray-400">{overview.expiredCount > 0 ? formatCurrency(overview.expiredAmount) : 'Всё в порядке'}</div></div></CardContent></Card>
      </div>

      {/* Structure */}
      <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 Структура обеспечения</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[{ name: 'Обеспечение заявок', value: overview.applicationSecurityTotal, color: '#3b82f6' }, { name: 'Обеспечение контрактов', value: overview.contractSecurityTotal, color: '#8b5cf6' }].map(item => <div key={item.name} className="space-y-2"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: item.color }} /><span className="text-sm">{item.name}</span></div><div className="font-semibold">{formatCurrency(item.value)}</div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: overview.totalAmount > 0 ? `${(item.value / overview.totalAmount) * 100}%` : '0%', background: item.color }} /></div></div>)}</div></CardContent></Card>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">📝</span><div><div className="font-bold">{formatCurrency(overview.applicationSecurityTotal)}</div><div className="text-xs text-gray-500">Обеспечение заявок</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-lg">📄</span><div><div className="font-bold">{formatCurrency(overview.contractSecurityTotal)}</div><div className="text-xs text-gray-500">Обеспечение контрактов</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">💰</span><div><div className="font-bold">{formatCurrency(overview.avgGuaranteeAmount)}</div><div className="text-xs text-gray-500">Средняя сумма</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">📅</span><div><div className="font-bold">{data.expiringGuarantees.length}</div><div className="text-xs text-gray-500">Скоро истекают</div></div></CardContent></Card>
      </div>

      {/* Alerts */}
      {data.expiringGuarantees.length > 0 && (
        <Alert><AlertDescription><h4 className="font-semibold mb-2">⚠️ Гарантии требуют внимания ({data.expiringGuarantees.length})</h4><div className="space-y-2">{data.expiringGuarantees.slice(0, 5).map(g => <div key={g.id} className="flex justify-between items-center p-2 bg-amber-50 rounded"><div><span className="font-medium">{g.purchaseNumber}</span><div className="text-xs text-gray-500">{getTypeLabel(g.type)}</div></div><div className="text-right"><Badge className={g.daysLeft <= 7 ? 'bg-red-500' : 'bg-amber-500'}>{g.daysLeft === 0 ? 'Сегодня!' : g.daysLeft === 1 ? 'Завтра' : `${g.daysLeft} дн`}</Badge><div className="text-xs font-medium mt-1">{formatCurrency(g.amount)}</div></div></div>)}</div></AlertDescription></Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}>📊 Обзор</Button>
        <Button variant={activeTab === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('all')}>📋 Все гарантии</Button>
        <Button variant={activeTab === 'expiring' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('expiring')}>⏰ Истекающие</Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 По типам обеспечения</h3>{data.byType.length > 0 ? <><div className="h-48"><Doughnut data={typeChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.raw as number)}` } } } }} /></div><div className="mt-3 space-y-2">{data.byType.map(type => <div key={type.type} className="flex items-center justify-between text-sm"><span>{type.label}</span><div className="flex gap-3"><Badge variant="outline">{type.count} шт</Badge><span className="font-semibold">{formatCurrency(type.amount)}</span></div></div>)}</div></> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🔄 По статусам</h3>{overview.totalCount > 0 ? <div className="h-48"><Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
          <Card className="md:col-span-2"><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Динамика по месяцам</h3>{data.monthly.length > 0 ? <div className="h-64"><Bar data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.raw as number)}` } } }, scales: { y: { beginAtZero: true } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
        </div>
      )}

      {activeTab === 'all' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-2"><h3 className="font-semibold">Все гарантии ({filteredGuarantees.length})</h3><div className="flex gap-1">{(['all', 'active', 'expiring', 'expired'] as Filter[]).map(f => <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>{f === 'all' ? 'Все' : f === 'active' ? 'Активные' : f === 'expiring' ? 'Истекают' : 'Истекшие'}</Button>)}</div></div>{filteredGuarantees.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Номер закупки</th><th className="text-left p-3 font-medium">Заказчик</th><th className="text-center p-3 font-medium">Тип</th><th className="text-right p-3 font-medium">Сумма</th><th className="text-center p-3 font-medium">Срок действия</th><th className="text-center p-3 font-medium">Осталось</th><th className="text-center p-3 font-medium">Статус</th></tr></thead><tbody>{filteredGuarantees.map(g => <tr key={g.id} className={`border-b hover:bg-gray-50 ${g.status === 'expired' ? 'bg-red-50' : g.status === 'expiring' || g.daysLeft <= 14 ? 'bg-amber-50' : ''}`}><td className="p-3 font-medium">{g.purchaseNumber}</td><td className="p-3 truncate max-w-[200px]">{g.customer}</td><td className="p-3 text-center"><Badge variant={g.type === 'application' ? 'default' : 'secondary'}>{g.type === 'application' ? 'Заявка' : 'Контракт'}</Badge></td><td className="p-3 text-right font-semibold">{formatCurrency(g.amount)}</td><td className="p-3 text-center text-xs">{formatDate(g.startDate)} — {formatDate(g.endDate)}</td><td className="p-3 text-center">{g.status === 'returned' ? <span className="text-gray-400">—</span> : g.daysLeft > 0 ? <span className={g.daysLeft <= 14 ? 'text-amber-600 font-semibold' : ''}>{g.daysLeft} дн</span> : <span className="text-red-600 font-semibold">Истекла</span>}</td><td className="p-3 text-center">{getStatusBadge(g.status)}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">📭 Нет гарантий по выбранному фильтру</div>}</CardContent></Card>
      )}

      {activeTab === 'expiring' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">⏰ Истекающие гарантии</h3></div>{data.expiringGuarantees.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Номер закупки</th><th className="text-left p-3 font-medium">Заказчик</th><th className="text-center p-3 font-medium">Тип</th><th className="text-right p-3 font-medium">Сумма</th><th className="text-center p-3 font-medium">Истекает</th><th className="text-center p-3 font-medium">Осталось</th><th className="text-left p-3 font-medium">Исполнитель</th></tr></thead><tbody>{data.expiringGuarantees.map(g => <tr key={g.id} className={`border-b hover:bg-gray-50 ${g.daysLeft <= 7 ? 'bg-red-50' : 'bg-amber-50'}`}><td className="p-3 font-medium">{g.purchaseNumber}</td><td className="p-3 truncate max-w-[200px]">{g.customer}</td><td className="p-3 text-center"><Badge variant={g.type === 'application' ? 'default' : 'secondary'}>{g.type === 'application' ? 'Заявка' : 'Контракт'}</Badge></td><td className="p-3 text-right font-semibold">{formatCurrency(g.amount)}</td><td className="p-3 text-center">{formatDate(g.endDate)}</td><td className="p-3 text-center"><Badge className={g.daysLeft <= 7 ? 'bg-red-500' : 'bg-amber-500'}>{g.daysLeft === 0 ? 'Сегодня!' : `${g.daysLeft} дн`}</Badge></td><td className="p-3">{g.executor || <span className="text-gray-400">—</span>}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">✅ Нет истекающих гарантий — всё под контролем!</div>}</CardContent></Card>
      )}

      {/* Insights */}
      <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💡 Рекомендации</h3><div className="space-y-2 text-sm">{overview.totalCount > 0 ? (<><div className="flex items-center gap-2"><span>📊</span><span>Всего обеспечения: <strong>{formatCurrency(overview.totalAmount)}</strong> ({overview.totalCount} гарантий)</span></div>{overview.expiringCount > 0 && <div className="flex items-center gap-2 text-amber-600"><span>⚠️</span><span><strong>{overview.expiringCount} гарантий</strong> истекают в ближайшее время — проверьте сроки!</span></div>}{overview.expiredCount > 0 && <div className="flex items-center gap-2 text-red-600"><span>🚨</span><span><strong>{overview.expiredCount} гарантий</strong> истекли — требуется возврат или продление</span></div>}<div className="flex items-center gap-2"><span>💰</span><span>Активное обеспечение: <strong>{formatCurrency(overview.activeAmount)}</strong></span></div><div className="flex items-center gap-2"><span>📝</span><span>Своевременно возвращайте гарантии после завершения контрактов</span></div></>) : <div className="flex items-center gap-2"><span>📭</span><span>Нет данных по банковским гарантиям за выбранный период</span></div>}</div></CardContent></Card>
    </div>
  );
}
