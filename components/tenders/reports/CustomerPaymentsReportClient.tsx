'use client';

import { useState, useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import type { CustomerPaymentsReportData } from '@/lib/tenders/customer-payments-report-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Props {
  initialData: CustomerPaymentsReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'customers' | 'contracts' | 'dynamics';
type SortBy = 'amount' | 'overdue' | 'rate';

export default function CustomerPaymentsReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<CustomerPaymentsReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sortBy, setSortBy] = useState<SortBy>('amount');

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)} млрд ₽`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} млн ₽`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)} тыс ₽`;
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

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
      const response = await fetch(`/api/tenders/customer-payments-report?${params}`);
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
      ['Отчёт по оплатам от заказчиков'], [],
      ['Показатель', 'Значение'],
      ['Всего контрактов', data.overview.contractsCount.toString()],
      ['Заказчиков', data.overview.customersCount.toString()],
      ['Общая сумма', data.overview.totalContractValue.toString()],
      ['Получено', data.overview.receivedPayments.toString()],
      ['Ожидается', data.overview.pendingPayments.toString()],
      ['Просрочено', data.overview.overduePayments.toString()],
      ['% оплаты', `${data.overview.paymentRate.toFixed(1)}%`], [],
      ['Заказчики'], ['Заказчик', 'Контрактов', 'Сумма', 'Оплачено', 'Долг', '% оплаты', 'Просрочено'],
      ...data.customers.map(c => [c.customer, c.contractsCount.toString(), c.totalValue.toString(), c.paidValue.toString(), c.debtValue.toString(), `${c.paymentRate.toFixed(1)}%`, c.overdueCount.toString()]), [],
      ['Контракты'], ['Номер', 'Заказчик', 'Сумма', 'Оплачено', 'К оплате', 'Статус'],
      ...data.contracts.map(c => [c.purchaseNumber, c.customer, c.contractValue.toString(), c.paidAmount.toString(), c.pendingAmount.toString(), c.status]),
    ];
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-payments-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusChartData = useMemo(() => ({
    labels: ['Оплачено', 'Ожидается', 'Просрочено', 'Критично'],
    datasets: [{ data: [data.paymentStatus.paid.count, data.paymentStatus.pending.count, data.paymentStatus.overdue.count, data.paymentStatus.critical.count], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], borderWidth: 0 }],
  }), [data.paymentStatus]);

  const amountChartData = useMemo(() => ({
    labels: ['Оплачено', 'Ожидается', 'Просрочено', 'Критично'],
    datasets: [{ data: [data.paymentStatus.paid.amount, data.paymentStatus.pending.amount, data.paymentStatus.overdue.amount, data.paymentStatus.critical.amount], backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'], borderWidth: 0 }],
  }), [data.paymentStatus]);

  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      { label: 'Ожидается', data: data.monthly.map(m => m.expectedAmount), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
      { label: 'Получено', data: data.monthly.map(m => m.receivedAmount), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
    ],
  }), [data.monthly]);

  const sortedContracts = useMemo(() => {
    return [...data.contracts].sort((a, b) => {
      if (sortBy === 'amount') return b.pendingAmount - a.pendingAmount;
      if (sortBy === 'overdue') return a.daysToPayment - b.daysToPayment;
      return b.paymentRate - a.paymentRate;
    });
  }, [data.contracts, sortBy]);

  const { overview, paymentStatus } = data;

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-green-500">Оплачено</Badge>;
    if (status === 'pending') return <Badge className="bg-blue-500">Ожидается</Badge>;
    if (status === 'overdue') return <Badge className="bg-amber-500">Просрочено</Badge>;
    if (status === 'critical') return <Badge variant="destructive">Критично</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">💰 Оплаты от заказчиков</h1>
          <p className="text-gray-500 mt-1">Дебиторская задолженность и контроль платежей</p>
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
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">📋</span><div><div className="text-xl font-bold">{formatCurrency(overview.totalContractValue)}</div><div className="text-sm text-gray-500">Общая сумма</div><div className="text-xs text-gray-400">{overview.contractsCount} контрактов</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">✅</span><div><div className="text-xl font-bold text-green-600">{formatCurrency(overview.receivedPayments)}</div><div className="text-sm text-gray-500">Получено</div><div className="text-xs text-gray-400"><strong>{overview.paymentRate.toFixed(1)}%</strong> от общей суммы</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">⏳</span><div><div className="text-xl font-bold text-amber-600">{formatCurrency(overview.pendingPayments)}</div><div className="text-sm text-gray-500">Ожидается</div><div className="text-xs text-gray-400">{paymentStatus.pending.count} контрактов</div></div></CardContent></Card>
        <Card className={`border-l-4 ${overview.overduePayments > 0 ? 'border-l-red-500' : 'border-l-green-500'}`}><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">{overview.overduePayments > 0 ? '⚠️' : '👍'}</span><div><div className={`text-xl font-bold ${overview.overduePayments > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(overview.overduePayments)}</div><div className="text-sm text-gray-500">Просрочено</div><div className="text-xs text-gray-400">{overview.overduePayments > 0 ? `${paymentStatus.overdue.count + paymentStatus.critical.count} контрактов` : 'Нет просрочек'}</div></div></CardContent></Card>
      </div>

      {/* Progress */}
      <Card><CardContent className="p-4"><div className="flex justify-between items-center mb-2"><h3 className="font-semibold">📊 Прогресс оплаты</h3><span className="text-xl font-bold">{overview.paymentRate.toFixed(1)}%</span></div><div className="h-4 bg-gray-200 rounded-full overflow-hidden flex"><div className="h-full bg-green-500" style={{ width: `${overview.paymentRate}%` }} /><div className="h-full bg-blue-500" style={{ width: overview.totalContractValue > 0 ? `${(overview.pendingPayments / overview.totalContractValue) * 100}%` : '0%' }} /><div className="h-full bg-red-500" style={{ width: overview.totalContractValue > 0 ? `${(overview.overduePayments / overview.totalContractValue) * 100}%` : '0%' }} /></div><div className="flex gap-6 mt-3 text-sm"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" />Получено: {formatCurrency(overview.receivedPayments)}</div><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500" />Ожидается: {formatCurrency(overview.pendingPayments)}</div><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" />Просрочено: {formatCurrency(overview.overduePayments)}</div></div></CardContent></Card>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">🏢</span><div><div className="font-bold">{overview.customersCount}</div><div className="text-xs text-gray-500">Заказчиков</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">⏱️</span><div><div className="font-bold">{overview.avgPaymentDays} дн</div><div className="text-xs text-gray-500">Ср. срок оплаты</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">📅</span><div><div className="font-bold">{data.upcomingPayments.length}</div><div className="text-xs text-gray-500">Ожидаемых платежей</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${overview.overduePayments > 0 ? 'bg-red-100' : 'bg-green-100'}`}>{overview.overduePayments > 0 ? '🚨' : '✅'}</span><div><div className="font-bold">{data.overdueContracts.length}</div><div className="text-xs text-gray-500">Просроченных</div></div></CardContent></Card>
      </div>

      {/* Alerts */}
      {(data.upcomingPayments.length > 0 || data.overdueContracts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.upcomingPayments.length > 0 && (
            <Alert><AlertDescription><h4 className="font-semibold mb-2">⏰ Ожидаемые платежи ({data.upcomingPayments.length})</h4><div className="space-y-2">{data.upcomingPayments.slice(0, 5).map(item => <div key={item.id} className="flex justify-between items-center p-2 bg-amber-50 rounded"><div><span className="font-medium">{item.purchaseNumber}</span><div className="text-xs text-gray-500">{item.customer}</div></div><div className="text-right"><Badge className={item.urgency === 'critical' ? 'bg-red-500' : item.urgency === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}>{item.daysLeft === 0 ? 'Сегодня' : item.daysLeft === 1 ? 'Завтра' : `${item.daysLeft} дн`}</Badge><div className="text-xs font-medium mt-1">{formatCurrency(item.amount)}</div></div></div>)}</div></AlertDescription></Alert>
          )}
          {data.overdueContracts.length > 0 && (
            <Alert variant="destructive"><AlertDescription><h4 className="font-semibold mb-2">🚨 Просроченные платежи ({data.overdueContracts.length})</h4><div className="space-y-2">{data.overdueContracts.slice(0, 5).map(item => <div key={item.id} className="flex justify-between items-center p-2 bg-red-50 rounded"><div><span className="font-medium">{item.purchaseNumber}</span><div className="text-xs text-gray-600">{item.customer}</div></div><div className="text-right"><Badge variant="destructive">+{item.daysOverdue} дн</Badge><div className="text-xs font-medium mt-1">{formatCurrency(item.amount)}</div></div></div>)}</div></AlertDescription></Alert>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}>📊 Обзор</Button>
        <Button variant={activeTab === 'customers' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('customers')}>🏢 Заказчики</Button>
        <Button variant={activeTab === 'contracts' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('contracts')}>📋 Контракты</Button>
        <Button variant={activeTab === 'dynamics' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('dynamics')}>📈 Динамика</Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 Распределение по статусам</h3>{overview.contractsCount > 0 ? <><div className="h-48"><Doughnut data={statusChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } } }} /></div><div className="mt-3 space-y-2">{[{ name: 'Оплачено', color: '#10b981', data: paymentStatus.paid }, { name: 'Ожидается', color: '#3b82f6', data: paymentStatus.pending }, { name: 'Просрочено', color: '#f59e0b', data: paymentStatus.overdue }, { name: 'Критично', color: '#ef4444', data: paymentStatus.critical }].map(s => <div key={s.name} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: s.color }} /><span>{s.name}</span></div><div className="flex gap-3"><Badge variant="outline">{s.data.count}</Badge><span className="text-gray-500">{formatCurrency(s.data.amount)}</span></div></div>)}</div></> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💰 Суммы по статусам</h3>{overview.contractsCount > 0 ? <div className="h-48"><Doughnut data={amountChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.raw as number)}` } } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💵 Финансовый обзор</h3><div className="space-y-4"><div><div className="flex justify-between text-sm mb-1"><span>Общая сумма контрактов</span><span className="font-semibold">{formatCurrency(overview.totalContractValue)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-gray-400 rounded-full" style={{ width: '100%' }} /></div></div><div><div className="flex justify-between text-sm mb-1"><span>Получено платежей</span><span className="font-semibold text-green-600">{formatCurrency(overview.receivedPayments)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: overview.totalContractValue > 0 ? `${(overview.receivedPayments / overview.totalContractValue) * 100}%` : '0%' }} /></div></div><div><div className="flex justify-between text-sm mb-1"><span>Дебиторская задолженность</span><span className="font-semibold text-red-600">{formatCurrency(overview.pendingPayments + overview.overduePayments)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: overview.totalContractValue > 0 ? `${((overview.pendingPayments + overview.overduePayments) / overview.totalContractValue) * 100}%` : '0%' }} /></div></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Ключевые показатели</h3><div className="grid grid-cols-2 gap-4"><div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-2xl font-bold">{overview.paymentRate.toFixed(1)}%</div><div className="text-xs text-gray-500">% оплаты</div></div><div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-2xl font-bold">{overview.avgPaymentDays}</div><div className="text-xs text-gray-500">Ср. дней оплаты</div></div><div className="text-center p-3 bg-gray-50 rounded-lg"><div className="text-2xl font-bold">{overview.customersCount}</div><div className="text-xs text-gray-500">Заказчиков</div></div><div className="text-center p-3 bg-gray-50 rounded-lg"><div className={`text-2xl font-bold ${overview.overduePayments > 0 ? 'text-red-600' : 'text-green-600'}`}>{data.overdueContracts.length}</div><div className="text-xs text-gray-500">Просрочено</div></div></div></CardContent></Card>
        </div>
      )}

      {activeTab === 'customers' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">🏢 Дебиторская задолженность по заказчикам</h3></div>{data.customers.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-center p-3 font-medium w-12">#</th><th className="text-left p-3 font-medium">Заказчик</th><th className="text-right p-3 font-medium">Контрактов</th><th className="text-right p-3 font-medium">Сумма</th><th className="text-right p-3 font-medium">Оплачено</th><th className="text-right p-3 font-medium">Долг</th><th className="text-right p-3 font-medium">% оплаты</th><th className="text-right p-3 font-medium">Просрочено</th></tr></thead><tbody>{data.customers.map((customer, idx) => <tr key={customer.customer} className={`border-b hover:bg-gray-50 ${customer.overdueCount > 0 ? 'bg-amber-50' : ''}`}><td className="p-3 text-center"><Badge variant="outline">{idx + 1}</Badge></td><td className="p-3 font-medium">{customer.customer}</td><td className="p-3 text-right">{customer.contractsCount}</td><td className="p-3 text-right font-semibold">{formatCurrency(customer.totalValue)}</td><td className="p-3 text-right font-semibold text-green-600">{formatCurrency(customer.paidValue)}</td><td className="p-3 text-right">{customer.debtValue > 0 ? <Badge variant="destructive">{formatCurrency(customer.debtValue)}</Badge> : <span className="text-green-600">—</span>}</td><td className="p-3 text-right"><Badge className={customer.paymentRate >= 100 ? 'bg-green-500' : customer.paymentRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}>{customer.paymentRate.toFixed(0)}%</Badge></td><td className="p-3 text-right">{customer.overdueCount > 0 ? <Badge variant="destructive">{customer.overdueCount}</Badge> : <span className="text-gray-400">—</span>}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет данных по заказчикам</div>}</CardContent></Card>
      )}

      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2"><span className="text-sm text-gray-500">Сортировка:</span><Button variant={sortBy === 'amount' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('amount')}>По сумме</Button><Button variant={sortBy === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('overdue')}>По сроку</Button><Button variant={sortBy === 'rate' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('rate')}>По % оплаты</Button></div>
          <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">📋 Контракты и платежи</h3></div>{sortedContracts.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Номер закупки</th><th className="text-left p-3 font-medium">Заказчик</th><th className="text-right p-3 font-medium">Сумма</th><th className="text-right p-3 font-medium">Оплачено</th><th className="text-right p-3 font-medium">К оплате</th><th className="text-center p-3 font-medium">Срок</th><th className="text-center p-3 font-medium">Статус</th><th className="text-left p-3 font-medium">Исполнитель</th></tr></thead><tbody>{sortedContracts.map(contract => <tr key={contract.id} className={`border-b hover:bg-gray-50 ${contract.status === 'critical' ? 'bg-red-50' : contract.status === 'overdue' ? 'bg-amber-50' : ''}`}><td className="p-3 font-medium">{contract.purchaseNumber}</td><td className="p-3 truncate max-w-[200px]">{contract.customer}</td><td className="p-3 text-right font-semibold">{formatCurrency(contract.contractValue)}</td><td className="p-3 text-right text-green-600">{formatCurrency(contract.paidAmount)}</td><td className="p-3 text-right">{contract.pendingAmount > 0 ? <Badge variant="destructive">{formatCurrency(contract.pendingAmount)}</Badge> : <span className="text-green-600">—</span>}</td><td className="p-3 text-center">{contract.dueDate ? formatDate(contract.dueDate) : '—'}</td><td className="p-3 text-center">{getStatusBadge(contract.status)}</td><td className="p-3">{contract.executor || <span className="text-gray-400">—</span>}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет данных по контрактам</div>}</CardContent></Card>
        </div>
      )}

      {activeTab === 'dynamics' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Динамика платежей</h3><div className="h-64"><Line data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} /></div></CardContent></Card>
          <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">📅 Детализация по месяцам</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Месяц</th><th className="text-right p-3 font-medium">Ожидается</th><th className="text-right p-3 font-medium">Получено</th><th className="text-right p-3 font-medium">% выполнения</th><th className="text-right p-3 font-medium">Разница</th></tr></thead><tbody>{data.monthly.map(month => <tr key={month.month} className="border-b"><td className="p-3 font-medium">{month.monthLabel}</td><td className="p-3 text-right">{formatCurrency(month.expectedAmount)}</td><td className="p-3 text-right text-green-600 font-semibold">{formatCurrency(month.receivedAmount)}</td><td className="p-3 text-right"><Badge className={month.expectedAmount > 0 && (month.receivedAmount / month.expectedAmount) >= 1 ? 'bg-green-500' : (month.receivedAmount / month.expectedAmount) >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}>{month.expectedAmount > 0 ? ((month.receivedAmount / month.expectedAmount) * 100).toFixed(0) : 0}%</Badge></td><td className="p-3 text-right"><span className={month.receivedAmount >= month.expectedAmount ? 'text-green-600' : 'text-red-600'}>{formatCurrency(month.receivedAmount - month.expectedAmount)}</span></td></tr>)}</tbody></table></div></CardContent></Card>
        </div>
      )}

      {/* Insights */}
      <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💡 Аналитические выводы</h3><div className="space-y-2 text-sm">{overview.contractsCount > 0 ? (<><div className="flex items-center gap-2"><span>{overview.paymentRate >= 80 ? '🏆' : overview.paymentRate >= 50 ? '📈' : '⚠️'}</span><span>Процент оплаты <strong>{overview.paymentRate.toFixed(1)}%</strong> — {overview.paymentRate >= 80 ? 'отлично!' : overview.paymentRate >= 50 ? 'хороший результат' : 'требует внимания'}</span></div><div className="flex items-center gap-2"><span>⏱️</span><span>Средний срок оплаты: <strong>{overview.avgPaymentDays} дней</strong></span></div>{data.customers.length > 0 && <div className="flex items-center gap-2"><span>🏢</span><span>Крупнейший должник: <strong>{data.customers[0]?.customer}</strong> ({formatCurrency(data.customers[0]?.debtValue || 0)})</span></div>}{data.upcomingPayments.length > 0 && <div className="flex items-center gap-2 text-amber-600"><span>📅</span><span><strong>{data.upcomingPayments.length}</strong> ожидаемых платежей в ближайшее время</span></div>}{data.overdueContracts.length > 0 && <div className="flex items-center gap-2 text-red-600"><span>🚨</span><span><strong>{data.overdueContracts.length}</strong> просроченных платежей на сумму <strong>{formatCurrency(overview.overduePayments)}</strong></span></div>}</>) : <div className="flex items-center gap-2"><span>📭</span><span>Нет данных за выбранный период</span></div>}</div></CardContent></Card>
    </div>
  );
}
