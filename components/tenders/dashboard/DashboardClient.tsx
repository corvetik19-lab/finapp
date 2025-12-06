'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DashboardData } from '@/lib/tenders/dashboard-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronRight, Trophy, Clock } from 'lucide-react';

interface Props {
  initialData: DashboardData;
  companyId: string;
}

export default function DashboardClient({ initialData, companyId }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/tenders/dashboard?company_id=${companyId}`);
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      }
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)} млрд ₽`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)} млн ₽`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)} тыс ₽`;
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const { overview, byStage, byType, monthly, topManagers, recentTenders, upcomingDeadlines, taskSummary } = data;

  // Calculate max values for charts
  const maxMonthlyCount = Math.max(...monthly.map(m => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">📊 Дашборд тендеров</h1>
          <p className="text-gray-500 mt-1">Аналитика и ключевые показатели эффективности</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />Обновить
          </Button>
          <Button asChild><Link href="/tenders/department">📋 К тендерам</Link></Button>
        </div>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">📋</span>
              {overview.activeTenders > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{overview.activeTenders} активных</span>}
            </div>
            <div className="text-3xl font-bold text-gray-900">{overview.totalTenders}</div>
            <div className="text-sm text-gray-500">Всего тендеров</div>
            <div className="text-xs text-gray-400 mt-1">На рассмотрении: {overview.pendingTenders}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🏆</span>
              <span className={`text-xs px-2 py-1 rounded-full ${overview.winRate >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{overview.winRate.toFixed(0)}% побед</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{overview.wonTenders}</div>
            <div className="text-sm text-gray-500">Выиграно</div>
            <div className="text-xs text-gray-400 mt-1">Проиграно: {overview.lostTenders}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2"><span className="text-2xl">💰</span></div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(overview.totalNmck)}</div>
            <div className="text-sm text-gray-500">Общая НМЦК</div>
            <div className="text-xs text-gray-400 mt-1">Контракты: {formatCurrency(overview.totalContractPrice)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">💎</span>
              {overview.totalNmck > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">{((overview.totalSavings / overview.totalNmck) * 100).toFixed(1)}%</span>}
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(overview.totalSavings)}</div>
            <div className="text-sm text-gray-500">Экономия</div>
            <div className="text-xs text-gray-400 mt-1">Средний контракт: {formatCurrency(overview.avgContractValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">📈 По этапам</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byStage.length > 0 ? byStage.map(stage => (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: stage.color }} />
                    <span className="text-gray-700">{stage.stage}</span>
                  </div>
                  <span className="font-medium">{stage.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${stage.percent}%`, background: stage.color }} />
                </div>
              </div>
            )) : <div className="text-center py-8 text-gray-500"><span className="text-3xl">📊</span><p className="mt-2">Нет данных</p></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">🏷️ По типам</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {byType.length > 0 ? byType.map((type, idx) => {
              const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
              const color = colors[idx % colors.length];
              return (
                <div key={type.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
                      <span className="text-gray-700">{type.type}</span>
                    </div>
                    <span className="font-medium">{type.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${type.percent}%`, background: color }} />
                  </div>
                </div>
              );
            }) : <div className="text-center py-8 text-gray-500"><span className="text-3xl">🏷️</span><p className="mt-2">Нет данных</p></div>}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card className="mb-6">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">📅 Динамика за 12 месяцев</CardTitle>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" />Победы</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" />Проигрыши</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400" />В работе</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {monthly.map(month => {
              const other = month.count - month.won - month.lost;
              const wonHeight = (month.won / maxMonthlyCount) * 100;
              const lostHeight = (month.lost / maxMonthlyCount) * 100;
              const otherHeight = (other / maxMonthlyCount) * 100;
              return (
                <div key={month.monthKey} className="flex-1 flex flex-col items-center gap-1" title={`${month.month}: ${month.count}`}>
                  <div className="w-full flex flex-col-reverse h-32">
                    {month.won > 0 && <div className="bg-green-500 rounded-t" style={{ height: `${wonHeight}%` }} title={`Выиграно: ${month.won}`} />}
                    {other > 0 && <div className="bg-gray-400" style={{ height: `${otherHeight}%` }} title={`В работе: ${other}`} />}
                    {month.lost > 0 && <div className="bg-red-500 rounded-b" style={{ height: `${lostHeight}%` }} title={`Проиграно: ${month.lost}`} />}
                  </div>
                  <span className="text-xs text-gray-500">{month.month.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">🕐 Последние тендеры</CardTitle>
            <Link href="/tenders/list" className="text-sm text-blue-600 hover:underline flex items-center gap-1">Все тендеры <ChevronRight className="h-4 w-4" /></Link>
          </CardHeader>
          <CardContent className="divide-y">
            {recentTenders.length > 0 ? recentTenders.map(tender => (
              <Link key={tender.id} href={`/tenders/${tender.id}`} className="flex items-center gap-3 py-3 hover:bg-gray-50 -mx-4 px-4">
                <div className="w-1 h-10 rounded-full" style={{ background: tender.stageColor }} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{tender.customer}</div>
                  <div className="text-xs text-gray-500 truncate">{tender.subject}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">{formatCurrency(tender.nmck)}</div>
                  <div className="text-xs text-gray-400">{formatDate(tender.createdAt)}</div>
                </div>
              </Link>
            )) : <div className="text-center py-8 text-gray-500"><span className="text-3xl">📋</span><p className="mt-2">Нет тендеров</p></div>}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Ближайшие сроки</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcomingDeadlines.length > 0 ? upcomingDeadlines.map(deadline => (
                <Link key={deadline.id} href={`/tenders/${deadline.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white ${deadline.daysLeft <= 2 ? 'bg-red-500' : deadline.daysLeft <= 5 ? 'bg-amber-500' : 'bg-blue-500'}`}>
                    <span className="text-lg font-bold leading-none">{deadline.daysLeft}</span>
                    <span className="text-xs">{deadline.daysLeft === 1 ? 'день' : deadline.daysLeft < 5 ? 'дня' : 'дней'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{deadline.customer}</div>
                    <div className="text-xs text-gray-500 truncate">{deadline.purchaseNumber}</div>
                  </div>
                </Link>
              )) : <div className="text-center py-4 text-gray-500">✅ Нет срочных дел</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">✅ Задачи</CardTitle>
              <Link href="/tenders/tasks" className="text-sm text-blue-600 hover:underline">Все →</Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-gray-50 rounded-lg"><div className="text-xl font-bold">{taskSummary.total}</div><div className="text-xs text-gray-500">Всего</div></div>
                <div className="p-2 bg-blue-50 rounded-lg"><div className="text-xl font-bold text-blue-600">{taskSummary.inProgress}</div><div className="text-xs text-gray-500">В работе</div></div>
                <div className="p-2 bg-green-50 rounded-lg"><div className="text-xl font-bold text-green-600">{taskSummary.completed}</div><div className="text-xs text-gray-500">Готово</div></div>
                <div className="p-2 bg-red-50 rounded-lg"><div className="text-xl font-bold text-red-600">{taskSummary.overdue}</div><div className="text-xs text-gray-500">Просрочено</div></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" />Топ менеджеров</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topManagers.length > 0 ? topManagers.map((manager, idx) => (
              <div key={manager.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="text-2xl w-8">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-sm font-bold text-gray-400">{idx + 1}</span>}</div>
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">{manager.name.split(' ').map(n => n[0]).join('')}</div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{manager.name}</div>
                  <div className="text-xs text-gray-500 flex gap-3"><span>📋 {manager.totalTenders}</span><span>🏆 {manager.wonTenders}</span><span>💰 {formatCurrency(manager.totalContractValue)}</span></div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${manager.winRate >= 60 ? 'bg-green-100 text-green-700' : manager.winRate >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{manager.winRate.toFixed(0)}%</div>
              </div>
            )) : <div className="text-center py-8 text-gray-500">👥 Нет данных</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">⚡ Быстрые действия</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link href="/tenders/department" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
              <span className="text-2xl">📝</span><span className="text-sm font-medium">Новый тендер</span>
            </Link>
            <Link href="/tenders/tasks" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
              <span className="text-2xl">✅</span><span className="text-sm font-medium">Задачи</span>
            </Link>
            <Link href="/tenders/calendar" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
              <span className="text-2xl">📅</span><span className="text-sm font-medium">Календарь</span>
            </Link>
            <Link href="/tenders/list" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
              <span className="text-2xl">📋</span><span className="text-sm font-medium">Реестр</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
