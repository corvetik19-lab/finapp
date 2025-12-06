'use client';

import { useState, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import type { DepartmentReportData } from '@/lib/tenders/department-report-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Props {
  initialData: DepartmentReportData;
  companyId: string;
}

type Period = 'month' | 'quarter' | 'year' | 'all';
type Tab = 'overview' | 'specialists' | 'stages' | 'dynamics';

export default function DepartmentReportClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<DepartmentReportData>(initialData);
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
      const response = await fetch(`/api/tenders/department-report?${params}`);
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
      ['Отчёт по тендерному отделу'], [],
      ['Показатель', 'Значение'],
      ['Всего тендеров', data.overview.totalTenders.toString()],
      ['Активных', data.overview.activeTenders.toString()],
      ['Выигранных', data.overview.wonTenders.toString()],
      ['Проигранных', data.overview.lostTenders.toString()],
      ['Win Rate', `${data.overview.winRate.toFixed(1)}%`],
      ['Общая НМЦК', data.overview.totalNmck.toString()],
      ['Ср. срок обработки', `${data.overview.avgProcessingDays} дней`], [],
      ['Специалисты'], ['Имя', 'Всего', 'Выиграно', 'Win Rate', 'НМЦК'],
      ...data.specialists.map(s => [s.name, s.totalTenders.toString(), s.wonTenders.toString(), `${s.winRate.toFixed(1)}%`, s.totalNmck.toString()]), [],
      ['По этапам'], ['Этап', 'Количество', '%', 'НМЦК'],
      ...data.stages.map(s => [s.stageName, s.count.toString(), `${s.percent.toFixed(1)}%`, s.totalNmck.toString()]),
    ];
    const csvContent = rows.map(row => row.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `department-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const monthlyChartData = useMemo(() => ({
    labels: data.monthly.map(m => m.monthLabel),
    datasets: [
      { label: 'Подано', data: data.monthly.map(m => m.submitted), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.4 },
      { label: 'Выиграно', data: data.monthly.map(m => m.won), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
      { label: 'Проиграно', data: data.monthly.map(m => m.lost), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 },
    ],
  }), [data.monthly]);

  const stagesChartData = useMemo(() => ({
    labels: data.stages.map(s => s.stageName),
    datasets: [{ data: data.stages.map(s => s.count), backgroundColor: data.stages.map(s => s.stageColor || '#6b7280'), borderWidth: 0 }],
  }), [data.stages]);

  const workloadChartData = useMemo(() => ({
    labels: ['Срочные', 'На неделе', 'След. неделя', 'Просрочено'],
    datasets: [{ data: [data.workload.urgent, data.workload.thisWeek, data.workload.nextWeek, data.workload.overdue], backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'], borderWidth: 0 }],
  }), [data.workload]);

  const { overview, workload } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">👥 Отчёт по тендерному отделу</h1>
          <p className="text-gray-500 mt-1">Эффективность работы отдела и специалистов</p>
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
        <Card className="border-l-4 border-l-red-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">❌</span><div><div className="text-xl font-bold text-red-600">{overview.lostTenders}</div><div className="text-sm text-gray-500">Проиграно</div><div className="text-xs text-gray-400">Отменено: {overview.cancelledTenders}</div></div></CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="p-4 flex items-center gap-3"><span className="text-3xl">💰</span><div><div className="text-xl font-bold text-purple-600">{formatCurrency(overview.totalNmck)}</div><div className="text-sm text-gray-500">Общая НМЦК</div><div className="text-xs text-gray-400">Контракты: {formatCurrency(overview.totalContractPrice)}</div></div></CardContent></Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">⏱️</span><div><div className="font-bold">{overview.avgProcessingDays} дн</div><div className="text-xs text-gray-500">Ср. срок обработки</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">👤</span><div><div className="font-bold">{data.specialists.length}</div><div className="text-xs text-gray-500">Специалистов</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">📊</span><div><div className="font-bold">{overview.tendersPerSpecialist}</div><div className="text-xs text-gray-500">Тендеров на человека</div></div></CardContent></Card>
        <Card><CardContent className="p-3 flex items-center gap-3"><span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${workload.overdue > 0 ? 'bg-red-100' : 'bg-green-100'}`}>{workload.overdue > 0 ? '🚨' : '✅'}</span><div><div className={`font-bold ${workload.overdue > 0 ? 'text-red-600' : ''}`}>{workload.overdue}</div><div className="text-xs text-gray-500">Просрочено</div></div></CardContent></Card>
      </div>

      {/* Workload */}
      {workload.total > 0 && (
        <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">⏰ Загрузка отдела</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center"><div className="text-2xl font-bold text-amber-600">{workload.urgent}</div><div className="text-xs text-gray-600">Срочные (1-2 дня)</div></div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{workload.thisWeek}</div><div className="text-xs text-gray-600">На этой неделе</div></div>
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{workload.nextWeek}</div><div className="text-xs text-gray-600">След. неделя</div></div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center"><div className="text-2xl font-bold text-red-600">{workload.overdue}</div><div className="text-xs text-gray-600">Просрочено</div></div>
        </div></CardContent></Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('overview')}>📊 Обзор</Button>
        <Button variant={activeTab === 'specialists' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('specialists')}>👥 Специалисты</Button>
        <Button variant={activeTab === 'stages' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('stages')}>🎯 Этапы</Button>
        <Button variant={activeTab === 'dynamics' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('dynamics')}>📈 Динамика</Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📊 Эффективность по типам</h3>{data.byType.length > 0 ? <div className="space-y-3">{data.byType.map(type => <div key={type.typeId}><div className="flex justify-between items-center mb-1"><span className="font-medium">{type.typeName}</span><span className={type.winRate >= 50 ? 'text-green-600' : type.winRate >= 30 ? 'text-amber-600' : 'text-red-600'}>{type.winRate.toFixed(0)}%</span></div><div className="flex gap-2 text-xs text-gray-500 mb-1"><span>Всего: {type.count}</span><span className="text-green-600">✓ {type.wonCount}</span><span className="text-red-600">✗ {type.lostCount}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${type.winRate}%`, background: type.winRate >= 50 ? '#10b981' : type.winRate >= 30 ? '#f59e0b' : '#ef4444' }} /></div></div>)}</div> : <div className="text-center py-8 text-gray-500">Нет данных по типам</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🏪 По площадкам</h3>{data.byPlatform.length > 0 ? <div className="space-y-3">{data.byPlatform.map((platform, idx) => <div key={platform.platformId} className="flex items-center gap-3"><Badge variant="outline">{idx + 1}</Badge><div className="flex-1 min-w-0"><div className="font-medium truncate">{platform.platformName}</div><div className="text-xs text-gray-500">{platform.count} тендеров • {platform.wonCount} выиграно • {platform.winRate.toFixed(0)}%</div></div><div className="text-sm font-semibold">{formatCurrency(platform.totalNmck)}</div></div>)}</div> : <div className="text-center py-8 text-gray-500">Нет данных по площадкам</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🎯 Распределение по этапам</h3>{data.stages.length > 0 ? <div className="h-48"><Doughnut data={stagesChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет данных по этапам</div>}</CardContent></Card>
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">⏰ Распределение дедлайнов</h3>{workload.total > 0 ? <div className="h-48"><Doughnut data={workloadChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } } }} /></div> : <div className="text-center py-8 text-gray-500">Нет активных тендеров</div>}</CardContent></Card>
        </div>
      )}

      {activeTab === 'specialists' && (
        <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">👥 Показатели специалистов</h3></div>{data.specialists.length > 0 ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-center p-3 font-medium w-12">#</th><th className="text-left p-3 font-medium">Специалист</th><th className="text-left p-3 font-medium">Роль</th><th className="text-right p-3 font-medium">Всего</th><th className="text-right p-3 font-medium">Активных</th><th className="text-right p-3 font-medium">Выиграно</th><th className="text-right p-3 font-medium">Проиграно</th><th className="text-right p-3 font-medium">Win Rate</th><th className="text-right p-3 font-medium">НМЦК</th><th className="text-right p-3 font-medium">Ср. срок</th></tr></thead><tbody>{data.specialists.map((spec, idx) => <tr key={spec.id} className="border-b hover:bg-gray-50"><td className="p-3 text-center"><Badge variant="outline">{idx + 1}</Badge></td><td className="p-3 font-medium">{spec.name}</td><td className="p-3"><Badge variant="secondary">{spec.role}</Badge></td><td className="p-3 text-right">{spec.totalTenders}</td><td className="p-3 text-right"><Badge variant="outline">{spec.activeTenders}</Badge></td><td className="p-3 text-right"><Badge className="bg-green-100 text-green-700">{spec.wonTenders}</Badge></td><td className="p-3 text-right"><Badge variant="destructive">{spec.lostTenders}</Badge></td><td className="p-3 text-right"><Badge className={spec.winRate >= 50 ? 'bg-green-500' : spec.winRate >= 30 ? 'bg-amber-500' : 'bg-red-500'}>{spec.winRate.toFixed(0)}%</Badge></td><td className="p-3 text-right font-semibold">{formatCurrency(spec.totalNmck)}</td><td className="p-3 text-right text-gray-500">{spec.avgProcessingDays} дн</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-gray-500">Нет данных по специалистам</div>}</CardContent></Card>
      )}

      {activeTab === 'stages' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">🎯 Воронка тендерного отдела</h3>{data.stages.length > 0 ? <><div className="h-64"><Bar data={{ labels: data.stages.map(s => s.stageName), datasets: [{ label: 'Количество', data: data.stages.map(s => s.count), backgroundColor: data.stages.map(s => s.stageColor), borderRadius: 8 }] }} options={{ responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }} /></div><div className="overflow-x-auto mt-4"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Этап</th><th className="text-right p-3 font-medium">Кол-во</th><th className="text-right p-3 font-medium">%</th><th className="text-right p-3 font-medium">Ср. дней</th><th className="text-right p-3 font-medium">НМЦК</th></tr></thead><tbody>{data.stages.map(stage => <tr key={stage.stageId} className="border-b"><td className="p-3 flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: stage.stageColor }} />{stage.stageName}</td><td className="p-3 text-right font-semibold">{stage.count}</td><td className="p-3 text-right">{stage.percent.toFixed(1)}%</td><td className="p-3 text-right text-gray-500">{stage.avgDaysInStage}</td><td className="p-3 text-right">{formatCurrency(stage.totalNmck)}</td></tr>)}</tbody></table></div></> : <div className="text-center py-8 text-gray-500">Нет данных по этапам</div>}</CardContent></Card>
          {data.lossReasons.length > 0 && <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">❌ Причины проигрышей</h3><div className="space-y-3">{data.lossReasons.map(reason => <div key={reason.reason}><div className="flex justify-between mb-1"><span className="font-medium">{reason.reason}</span><span>{reason.percent}%</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${reason.percent}%` }} /></div><div className="text-xs text-gray-500 mt-1">{reason.count} случаев</div></div>)}</div></CardContent></Card>}
        </div>
      )}

      {activeTab === 'dynamics' && (
        <div className="space-y-4">
          <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">📈 Динамика по месяцам</h3><div className="h-64"><Line data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }} /></div></CardContent></Card>
          <Card><CardContent className="p-0"><div className="p-4 border-b"><h3 className="font-semibold">📅 Детализация по месяцам</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left p-3 font-medium">Месяц</th><th className="text-right p-3 font-medium">Подано</th><th className="text-right p-3 font-medium">Выиграно</th><th className="text-right p-3 font-medium">Проиграно</th><th className="text-right p-3 font-medium">Win Rate</th><th className="text-right p-3 font-medium">НМЦК</th></tr></thead><tbody>{data.monthly.map(month => <tr key={month.month} className="border-b"><td className="p-3 font-medium">{month.monthLabel}</td><td className="p-3 text-right">{month.submitted}</td><td className="p-3 text-right"><Badge className="bg-green-100 text-green-700">{month.won}</Badge></td><td className="p-3 text-right"><Badge variant="destructive">{month.lost}</Badge></td><td className="p-3 text-right"><Badge className={month.winRate >= 50 ? 'bg-green-500' : month.winRate >= 30 ? 'bg-amber-500' : 'bg-red-500'}>{month.winRate.toFixed(0)}%</Badge></td><td className="p-3 text-right font-semibold">{formatCurrency(month.totalNmck)}</td></tr>)}</tbody></table></div></CardContent></Card>
        </div>
      )}

      {/* Insights */}
      <Card><CardContent className="p-4"><h3 className="font-semibold mb-3">💡 Аналитические выводы</h3><div className="space-y-2 text-sm">{overview.totalTenders > 0 ? (<><div className="flex items-center gap-2"><span>{overview.winRate >= 40 ? '🏆' : overview.winRate >= 20 ? '📈' : '⚠️'}</span><span>Win Rate <strong>{overview.winRate.toFixed(1)}%</strong> — {overview.winRate >= 40 ? 'отличный показатель!' : overview.winRate >= 20 ? 'хороший результат' : 'требует внимания'}</span></div><div className="flex items-center gap-2"><span>⏱️</span><span>Средний срок обработки: <strong>{overview.avgProcessingDays} дней</strong> — {overview.avgProcessingDays <= 14 ? 'оптимально' : overview.avgProcessingDays <= 30 ? 'в норме' : 'можно ускорить'}</span></div>{data.specialists.length > 0 && <div className="flex items-center gap-2"><span>👤</span><span>Лучший специалист: <strong>{data.specialists[0]?.name}</strong> ({data.specialists[0]?.wonTenders} побед, {data.specialists[0]?.winRate.toFixed(0)}%)</span></div>}{workload.urgent > 0 && <div className="flex items-center gap-2 text-red-600"><span>🚨</span><span><strong>{workload.urgent} срочных</strong> тендеров требуют внимания!</span></div>}{workload.overdue > 0 && <div className="flex items-center gap-2 text-red-600"><span>⏰</span><span><strong>{workload.overdue} просроченных</strong> тендеров!</span></div>}{data.lossReasons[0] && <div className="flex items-center gap-2"><span>📊</span><span>Основная причина проигрышей: <strong>{data.lossReasons[0].reason}</strong> ({data.lossReasons[0].percent}%)</span></div>}</>) : <div className="flex items-center gap-2"><span>📭</span><span>Нет данных за выбранный период</span></div>}</div></CardContent></Card>
    </div>
  );
}
