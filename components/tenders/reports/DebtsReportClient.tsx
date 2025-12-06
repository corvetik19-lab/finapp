'use client';

import { useState } from 'react';
import type { DebtsReportData } from '@/lib/tenders/debts-report-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2 } from 'lucide-react';

interface Props {
  initialData: DebtsReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'all' | 'critical' | 'customers';
type SortBy = 'debt' | 'overdue' | 'customer';

export default function DebtsReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<DebtsReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [sortBy, setSortBy] = useState<SortBy>('debt');

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
      if (newPeriod === 'month') {
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      } else if (newPeriod === 'quarter') {
        dateFrom = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
      } else if (newPeriod === 'year') {
        dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      }
      const params = new URLSearchParams({ company_id: companyId });
      if (dateFrom) params.append('date_from', dateFrom);
      const response = await fetch(`/api/tenders/debts-report?${params}`);
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
      ['Отчёт по дебиторской задолженности'], [],
      ['Показатель', 'Значение'],
      ['Общая задолженность', data.overview.totalDebt.toString()],
      ['Текущая', data.overview.currentDebt.toString()],
      ['Требует внимания', data.overview.warningDebt.toString()],
      ['Просрочено', data.overview.overdueDebt.toString()],
      ['Критично', data.overview.criticalDebt.toString()],
      ['Должников', data.overview.debtorsCount.toString()],
      ['Контрактов', data.overview.contractsCount.toString()], [],
      ['Должники'],
      ['Заказчик', 'Номер закупки', 'Сумма контракта', 'Оплачено', 'Долг', 'Срок оплаты', 'Просрочка (дн)', 'Статус'],
      ...data.debtors.map(d => [d.customer, d.purchaseNumber, d.contractPrice.toString(), d.paidAmount.toString(), d.debtAmount.toString(), d.dueDate || '', d.daysOverdue.toString(), d.status]),
    ];
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `debts-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { current: 'В срок', warning: 'Внимание', overdue: 'Просрочено', critical: 'Критично' };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (status === 'current') return 'default';
    if (status === 'warning') return 'secondary';
    return 'destructive';
  };

  const getRowClass = (status: string) => {
    if (status === 'critical') return 'bg-red-50';
    if (status === 'overdue') return 'bg-orange-50';
    if (status === 'warning') return 'bg-amber-50';
    return '';
  };

  const sortedDebtors = [...data.debtors].sort((a, b) => {
    if (sortBy === 'debt') return b.debtAmount - a.debtAmount;
    if (sortBy === 'overdue') return b.daysOverdue - a.daysOverdue;
    return a.customer.localeCompare(b.customer);
  });

  const { overview } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📋 Дебиторская задолженность</h1>
          <p className="text-gray-500 mt-1">Контроль долгов заказчиков</p>
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

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <div className="text-xl font-bold text-red-600">{formatCurrency(overview.totalDebt)}</div>
              <div className="text-sm text-gray-500">Общая задолженность</div>
              <div className="text-xs text-gray-400">{overview.contractsCount} контрактов</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(overview.currentDebt)}</div>
              <div className="text-sm text-gray-500">В срок</div>
              <div className="text-xs text-gray-400">Без просрочки</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <div className="text-xl font-bold text-amber-600">{formatCurrency(overview.warningDebt + overview.overdueDebt)}</div>
              <div className="text-sm text-gray-500">Просрочено</div>
              <div className="text-xs text-gray-400">Требует внимания</div>
            </div>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${overview.criticalDebt > 0 ? 'border-l-red-600' : 'border-l-green-500'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-3xl">{overview.criticalDebt > 0 ? '🚨' : '👍'}</span>
            <div>
              <div className={`text-xl font-bold ${overview.criticalDebt > 0 ? 'text-red-700' : 'text-green-600'}`}>{formatCurrency(overview.criticalDebt)}</div>
              <div className="text-sm text-gray-500">Критично</div>
              <div className="text-xs text-gray-400">{overview.criticalDebt > 0 ? 'Срочно взыскать!' : 'Нет критичных'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">🏢</span><div><div className="font-bold">{overview.debtorsCount}</div><div className="text-xs text-gray-500">Должников</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">⏱️</span><div><div className="font-bold">{overview.avgDaysOverdue} дн</div><div className="text-xs text-gray-500">Ср. просрочка</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">📊</span><div><div className="font-bold">{overview.collectionRate.toFixed(1)}%</div><div className="text-xs text-gray-500">Собираемость</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-lg">📅</span><div><div className="font-bold">{data.upcomingPayments.length}</div><div className="text-xs text-gray-500">Ожидаемых платежей</div></div></CardContent></Card>
      </div>

      {/* Critical Alert */}
      {data.criticalDebtors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <h3 className="font-semibold mb-2">🚨 Критические должники — требуют немедленных действий!</h3>
            <div className="space-y-2">
              {data.criticalDebtors.slice(0, 5).map(debtor => (
                <div key={debtor.id} className="flex items-center justify-between bg-red-50 p-2 rounded">
                  <div className="min-w-0">
                    <span className="font-medium">{debtor.purchaseNumber}</span>
                    <span className="ml-2 text-sm text-gray-600 truncate">{debtor.customer.substring(0, 50)}...</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="destructive">+{debtor.daysOverdue} дн</Badge>
                    <span className="font-bold">{formatCurrency(debtor.debtAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button variant={activeTab === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('all')}>📋 Все должники</Button>
        <Button variant={activeTab === 'critical' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('critical')}>🚨 Просроченные</Button>
        <Button variant={activeTab === 'customers' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('customers')}>🏢 По заказчикам</Button>
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="p-0">
          {activeTab === 'all' && (
            <div>
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Все должники ({data.debtors.length})</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Сортировка:</span>
                  <Button variant={sortBy === 'debt' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('debt')}>По сумме</Button>
                  <Button variant={sortBy === 'overdue' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('overdue')}>По просрочке</Button>
                  <Button variant={sortBy === 'customer' ? 'default' : 'outline'} size="sm" onClick={() => setSortBy('customer')}>По заказчику</Button>
                </div>
              </div>
              {sortedDebtors.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium">Заказчик</th>
                        <th className="text-left p-3 font-medium">Номер закупки</th>
                        <th className="text-right p-3 font-medium">Контракт</th>
                        <th className="text-right p-3 font-medium">Оплачено</th>
                        <th className="text-right p-3 font-medium">Долг</th>
                        <th className="text-center p-3 font-medium">Срок</th>
                        <th className="text-center p-3 font-medium">Просрочка</th>
                        <th className="text-center p-3 font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDebtors.map(debtor => (
                        <tr key={debtor.id} className={`border-b hover:bg-gray-50 ${getRowClass(debtor.status)}`}>
                          <td className="p-3"><span className="font-medium">{debtor.customer.substring(0, 40)}...</span></td>
                          <td className="p-3"><span className="text-blue-600">{debtor.purchaseNumber}</span></td>
                          <td className="p-3 text-right">{formatCurrency(debtor.contractPrice)}</td>
                          <td className="p-3 text-right text-green-600">{formatCurrency(debtor.paidAmount)}</td>
                          <td className="p-3 text-right"><Badge variant="destructive">{formatCurrency(debtor.debtAmount)}</Badge></td>
                          <td className="p-3 text-center">{formatDate(debtor.dueDate)}</td>
                          <td className="p-3 text-center">{debtor.daysOverdue > 0 ? <Badge variant="destructive">+{debtor.daysOverdue} дн</Badge> : <span className="text-green-600">—</span>}</td>
                          <td className="p-3 text-center"><Badge variant={getStatusVariant(debtor.status)}>{getStatusLabel(debtor.status)}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <span className="text-5xl">🎉</span>
                  <p className="mt-4 text-gray-500">Нет должников — отличная работа!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'critical' && (
            <div>
              <div className="p-4 border-b"><h3 className="font-semibold">🚨 Просроченные платежи</h3></div>
              {data.criticalDebtors.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-medium">Заказчик</th>
                        <th className="text-left p-3 font-medium">Номер закупки</th>
                        <th className="text-right p-3 font-medium">Долг</th>
                        <th className="text-center p-3 font-medium">Просрочка</th>
                        <th className="text-center p-3 font-medium">Статус</th>
                        <th className="text-left p-3 font-medium">Исполнитель</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.criticalDebtors.map(debtor => (
                        <tr key={debtor.id} className={`border-b hover:bg-gray-50 ${getRowClass(debtor.status)}`}>
                          <td className="p-3"><span className="font-medium">{debtor.customer.substring(0, 40)}...</span></td>
                          <td className="p-3"><span className="text-blue-600">{debtor.purchaseNumber}</span></td>
                          <td className="p-3 text-right"><Badge variant="destructive">{formatCurrency(debtor.debtAmount)}</Badge></td>
                          <td className="p-3 text-center"><Badge variant="destructive">+{debtor.daysOverdue} дн</Badge></td>
                          <td className="p-3 text-center"><Badge variant={getStatusVariant(debtor.status)}>{getStatusLabel(debtor.status)}</Badge></td>
                          <td className="p-3">{debtor.executor || <span className="text-gray-400">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <span className="text-5xl">✅</span>
                  <p className="mt-4 text-gray-500">Нет просроченных платежей!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'customers' && (
            <div>
              <div className="p-4 border-b"><h3 className="font-semibold">🏢 Задолженность по заказчикам</h3></div>
              {data.byCustomer.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-center p-3 font-medium w-12">#</th>
                        <th className="text-left p-3 font-medium">Заказчик</th>
                        <th className="text-right p-3 font-medium">Контрактов</th>
                        <th className="text-right p-3 font-medium">Общий долг</th>
                        <th className="text-right p-3 font-medium">Просрочено</th>
                        <th className="text-center p-3 font-medium">Ср. просрочка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCustomer.map((customer, idx) => (
                        <tr key={customer.customer} className={`border-b hover:bg-gray-50 ${customer.overdueDebt > 0 ? 'bg-amber-50' : ''}`}>
                          <td className="p-3 text-center"><Badge variant="outline">{idx + 1}</Badge></td>
                          <td className="p-3"><span className="font-medium">{customer.customer.substring(0, 50)}...</span></td>
                          <td className="p-3 text-right">{customer.contractsCount}</td>
                          <td className="p-3 text-right"><Badge variant="destructive">{formatCurrency(customer.totalDebt)}</Badge></td>
                          <td className="p-3 text-right">{customer.overdueDebt > 0 ? <Badge variant="destructive">{formatCurrency(customer.overdueDebt)}</Badge> : <span className="text-green-600">—</span>}</td>
                          <td className="p-3 text-center">{customer.avgDaysOverdue > 0 ? `${customer.avgDaysOverdue} дн` : <span className="text-green-600">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <span className="text-5xl">📭</span>
                  <p className="mt-4 text-gray-500">Нет данных по заказчикам</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">💡 Рекомендации по взысканию</h3>
          <div className="space-y-2">
            {overview.totalDebt > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm"><span>📊</span><span>Общая дебиторская задолженность: <strong>{formatCurrency(overview.totalDebt)}</strong></span></div>
                {overview.criticalDebt > 0 && <div className="flex items-center gap-2 text-sm text-red-600"><span>🚨</span><span><strong>{formatCurrency(overview.criticalDebt)}</strong> критической задолженности — немедленно направить претензии!</span></div>}
                {overview.overdueDebt > 0 && <div className="flex items-center gap-2 text-sm text-amber-600"><span>⚠️</span><span><strong>{formatCurrency(overview.overdueDebt)}</strong> просроченной задолженности — позвонить должникам</span></div>}
                <div className="flex items-center gap-2 text-sm"><span>📈</span><span>Собираемость платежей: <strong>{overview.collectionRate.toFixed(1)}%</strong></span></div>
                {overview.avgDaysOverdue > 0 && <div className="flex items-center gap-2 text-sm"><span>⏱️</span><span>Средняя просрочка: <strong>{overview.avgDaysOverdue} дней</strong></span></div>}
              </>
            )}
            {overview.totalDebt === 0 && <div className="flex items-center gap-2 text-sm"><span>🎉</span><span>Нет дебиторской задолженности — отличная работа!</span></div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
