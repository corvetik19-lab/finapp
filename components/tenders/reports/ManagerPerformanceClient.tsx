'use client';

import { useState, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import type { ManagerPerformanceReportData } from '@/lib/tenders/manager-performance-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface Props {
  initialData: ManagerPerformanceReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'ranking' | 'comparison';
type SortBy = 'winRate' | 'totalContracts' | 'totalTenders' | 'efficiency';

export default function ManagerPerformanceClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<ManagerPerformanceReportData>(initialData);
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sortBy, setSortBy] = useState<SortBy>('winRate');

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
      const response = await fetch(`/api/tenders/manager-performance?${params}`);
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
      ['Отчёт по показателям менеджеров'], [],
      ['Менеджер', 'Тендеров', 'Выиграно', 'Проиграно', 'Активных', '% побед', 'Сумма контрактов', 'НМЦК', 'Ср. сделка', 'Экономия %'],
      ...data.managers.map(m => [m.name, m.totalTenders.toString(), m.wonTenders.toString(), m.lostTenders.toString(), m.activeTenders.toString(), m.winRate.toFixed(1) + '%', m.totalContractPrice.toString(), m.totalNmck.toString(), m.avgDealSize.toString(), m.avgSavings.toFixed(1) + '%']),
    ];
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manager-performance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sortedManagers = useMemo(() => {
    return [...data.managers].sort((a, b) => {
      switch (sortBy) {
        case 'totalContracts': return b.totalContractPrice - a.totalContractPrice;
        case 'totalTenders': return b.totalTenders - a.totalTenders;
        case 'efficiency': return b.efficiency - a.efficiency;
        default: return b.winRate - a.winRate;
      }
    });
  }, [data.managers, sortBy]);

  const topManagers = sortedManagers.slice(0, 3);

  const managersChartData = useMemo(() => ({
    labels: sortedManagers.slice(0, 10).map(m => m.name.split(' ')[0]),
    datasets: [
      { label: 'Выиграно', data: sortedManagers.slice(0, 10).map(m => m.wonTenders), backgroundColor: '#10b981' },
      { label: 'Проиграно', data: sortedManagers.slice(0, 10).map(m => m.lostTenders), backgroundColor: '#ef4444' },
      { label: 'В работе', data: sortedManagers.slice(0, 10).map(m => m.activeTenders), backgroundColor: '#3b82f6' },
    ],
  }), [sortedManagers]);

  const contractsDistributionData = useMemo(() => ({
    labels: sortedManagers.slice(0, 5).map(m => m.name.split(' ')[0]),
    datasets: [{ data: sortedManagers.slice(0, 5).map(m => m.totalContractPrice), backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'], borderWidth: 0 }],
  }), [sortedManagers]);

  const winRateChartData = useMemo(() => ({
    labels: sortedManagers.slice(0, 10).map(m => m.name.split(' ')[0]),
    datasets: [{ label: '% побед', data: sortedManagers.slice(0, 10).map(m => m.winRate), backgroundColor: sortedManagers.slice(0, 10).map(m => m.winRate >= 50 ? '#10b981' : m.winRate >= 30 ? '#f59e0b' : '#ef4444') }],
  }), [sortedManagers]);

  const { overview } = data;
  const getRankEmoji = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  const getRankBg = (rank: number) => rank === 1 ? 'bg-amber-100 border-amber-300' : rank === 2 ? 'bg-gray-100 border-gray-300' : rank === 3 ? 'bg-orange-100 border-orange-300' : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">👤 Показатели менеджеров</h1>
          <p className="text-gray-500 mt-1">Индивидуальная эффективность и KPI</p>
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
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">👥</span><div><div className="text-xl font-bold">{overview.totalManagers}</div><div className="text-sm text-gray-500">Менеджеров</div><div className="text-xs text-gray-400">{overview.totalTenders} тендеров</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">🏆</span><div><div className="text-xl font-bold text-green-600">{overview.totalWon}</div><div className="text-sm text-gray-500">Выиграно</div><div className="text-xs text-gray-400">{overview.avgWinRate.toFixed(1)}% в среднем</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">💰</span><div><div className="text-xl font-bold text-purple-600">{formatCurrency(overview.totalContractSum)}</div><div className="text-sm text-gray-500">Сумма контрактов</div><div className="text-xs text-gray-400">НМЦК: {formatCurrency(overview.totalNmck)}</div></div></CardContent></Card>
        <Card className={`border-l-4 ${overview.avgSavings > 0 ? 'border-l-green-500' : 'border-l-gray-300'}`}><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">📉</span><div><div className={`text-xl font-bold ${overview.avgSavings > 0 ? 'text-green-600' : ''}`}>{overview.avgSavings.toFixed(1)}%</div><div className="text-sm text-gray-500">Экономия</div><div className="text-xs text-gray-400">От НМЦК</div></div></CardContent></Card>
      </div>

      {/* Top 3 Managers */}
      {topManagers.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">🏆 Лидеры рейтинга</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topManagers.map((manager, index) => (
              <Card key={manager.id} className={`${getRankBg(index + 1)} border-2`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{getRankEmoji(index + 1)}</span>
                    <div><div className="font-bold">{manager.name}</div><div className="text-xs text-gray-500">{manager.position || 'Менеджер'}</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Тендеров:</span> <strong>{manager.totalTenders}</strong></div>
                    <div><span className="text-gray-500">Выиграно:</span> <strong className="text-green-600">{manager.wonTenders}</strong></div>
                    <div><span className="text-gray-500">% побед:</span> <strong className="text-blue-600">{manager.winRate.toFixed(1)}%</strong></div>
                    <div><span className="text-gray-500">Контракты:</span> <strong className="text-purple-600">{formatCurrency(manager.totalContractPrice)}</strong></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}>📊 Обзор</Button>
        <Button variant={activeTab === 'ranking' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('ranking')}>🏅 Рейтинг</Button>
        <Button variant={activeTab === 'comparison' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('comparison')}>📈 Сравнение</Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 Результаты по менеджерам</h3>{sortedManagers.length > 0 ? <div className="h-64"><Bar data={managersChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💰 Распределение контрактов</h3>{sortedManagers.length > 0 ? <div className="h-64"><Doughnut data={contractsDistributionData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => ` ${formatCurrency(ctx.raw as number)}` } } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
          <Card className="md:col-span-2"><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Процент побед по менеджерам</h3>{sortedManagers.length > 0 ? <div className="h-64"><Bar data={winRateChartData} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${(ctx.raw as number).toFixed(1)}%` } } }, scales: { x: { beginAtZero: true, max: 100 } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет данных</div>}</CardContent></Card>
        </div>
      )}

      {activeTab === 'ranking' && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Рейтинг менеджеров ({sortedManagers.length})</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Сортировка:</span>
                {[{ key: 'winRate', label: 'По % побед' }, { key: 'totalContracts', label: 'По контрактам' }, { key: 'totalTenders', label: 'По количеству' }, { key: 'efficiency', label: 'По эффективности' }].map(s => (
                  <Button key={s.key} variant={sortBy === s.key as SortBy ? 'default' : 'outline'} size="sm" onClick={() => setSortBy(s.key as SortBy)}>{s.label}</Button>
                ))}
              </div>
            </div>
            {sortedManagers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-center p-3 font-medium w-12">#</th>
                      <th className="text-left p-3 font-medium">Менеджер</th>
                      <th className="text-right p-3 font-medium">Тендеров</th>
                      <th className="text-right p-3 font-medium">Выиграно</th>
                      <th className="text-right p-3 font-medium">Проиграно</th>
                      <th className="text-right p-3 font-medium">В работе</th>
                      <th className="text-right p-3 font-medium">% побед</th>
                      <th className="text-right p-3 font-medium">Контракты</th>
                      <th className="text-right p-3 font-medium">Ср. сделка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedManagers.map((manager, index) => (
                      <tr key={manager.id} className={`border-b hover:bg-gray-50 ${index < 3 ? 'bg-amber-50/50' : ''}`}>
                        <td className="p-3 text-center"><span className="text-lg">{index < 3 ? getRankEmoji(index + 1) : index + 1}</span></td>
                        <td className="p-3"><div className="font-medium">{manager.name}</div>{manager.position && <div className="text-xs text-gray-500">{manager.position}</div>}</td>
                        <td className="p-3 text-right">{manager.totalTenders}</td>
                        <td className="p-3 text-right"><Badge className="bg-green-100 text-green-700">{manager.wonTenders}</Badge></td>
                        <td className="p-3 text-right"><Badge variant="destructive">{manager.lostTenders}</Badge></td>
                        <td className="p-3 text-right"><Badge variant="secondary">{manager.activeTenders}</Badge></td>
                        <td className="p-3 text-right"><Badge className={manager.winRate >= 50 ? 'bg-green-500' : manager.winRate >= 30 ? 'bg-amber-500' : 'bg-red-500'}>{manager.winRate.toFixed(1)}%</Badge></td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(manager.totalContractPrice)}</td>
                        <td className="p-3 text-right text-gray-500">{formatCurrency(manager.avgDealSize)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center"><span className="text-5xl">👤</span><p className="mt-4 text-gray-500">Нет данных по менеджерам</p></div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'comparison' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedManagers.slice(0, 6).map(manager => (
            <Card key={manager.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{getRankEmoji(manager.rank)}</span>
                  <span className="font-bold">{manager.name}</span>
                </div>
                <div className="space-y-3">
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">% побед</span><span className="font-medium">{manager.winRate.toFixed(1)}%</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${manager.winRate}%`, background: manager.winRate >= 50 ? '#10b981' : manager.winRate >= 30 ? '#f59e0b' : '#ef4444' }} /></div></div>
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Тендеров</span><span className="font-medium">{manager.totalTenders}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(manager.totalTenders / Math.max(...sortedManagers.map(m => m.totalTenders))) * 100}%` }} /></div></div>
                  <div><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Контракты</span><span className="font-medium">{formatCurrency(manager.totalContractPrice)}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${(manager.totalContractPrice / Math.max(...sortedManagers.map(m => m.totalContractPrice))) * 100}%` }} /></div></div>
                </div>
                <div className="flex justify-between mt-4 text-sm"><span>✅ {manager.wonTenders}</span><span>❌ {manager.lostTenders}</span><span>⏳ {manager.activeTenders}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">✅ Лучшие показатели</h3>
            <div className="space-y-2 text-sm">
              {overview.bestManagerName && <div className="flex items-center gap-2"><span>🏆</span><span><strong>{overview.bestManagerName}</strong> — лидер по % побед ({overview.bestWinRate.toFixed(1)}%)</span></div>}
              <div className="flex items-center gap-2"><span>📊</span><span>Средний % побед команды: <strong>{overview.avgWinRate.toFixed(1)}%</strong></span></div>
              <div className="flex items-center gap-2"><span>💰</span><span>Общая сумма контрактов: <strong>{formatCurrency(overview.totalContractSum)}</strong></span></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">⚠️ Требует внимания</h3>
            <div className="space-y-2 text-sm">
              {sortedManagers.filter(m => m.winRate < 30).length > 0 && <div className="flex items-center gap-2"><span>📉</span><span><strong>{sortedManagers.filter(m => m.winRate < 30).length}</strong> менеджеров с низким % побед (&lt;30%)</span></div>}
              <div className="flex items-center gap-2"><span>📚</span><span>Рекомендуется обмен опытом между лидерами и новичками</span></div>
              <div className="flex items-center gap-2"><span>🔍</span><span>Проведите анализ причин проигранных тендеров</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
