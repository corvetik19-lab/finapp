'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DashboardData } from '@/lib/tenders/dashboard-service';
import type { TenderType, TenderStageTemplate } from '@/lib/tenders/types';
import type { EISTenderData } from '@/lib/tenders/eis-mock-data';
import { TenderSearchEISModal } from '@/components/tenders/tender-search-eis-modal';
import { TenderFormModal } from '@/components/tenders/tender-form-modal';
import { loadStageTemplates } from '@/lib/tenders/template-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Trophy,
  Banknote,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Clock,
  CheckSquare,
  Users,
  Calendar,
  ListTodo,
  PlusCircle,
  BarChart3,
} from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  short_name: string | null;
}

interface Props {
  initialData: DashboardData;
  companyId: string;
}

export default function DashboardNew({ initialData, companyId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Модалки
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [eisData, setEisData] = useState<EISTenderData | null>(null);
  
  // Данные для модалки
  const [types, setTypes] = useState<TenderType[]>([]);
  const [templates, setTemplates] = useState<TenderStageTemplate[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; role?: string }>>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [modalDataLoaded, setModalDataLoaded] = useState(false);

  // Загрузка данных для модалки при первом открытии
  const loadModalData = useCallback(async () => {
    if (modalDataLoaded) return;
    
    try {
      // Загружаем типы тендеров
      const typesRes = await fetch(`/api/tenders/types?company_id=${companyId}`);
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setTypes(typesData.data || []);
      }
      
      // Загружаем шаблоны
      const templatesData = await loadStageTemplates(companyId);
      setTemplates(templatesData);
      
      // Загружаем сотрудников
      const employeesRes = await fetch(`/api/tenders/employees?company_id=${companyId}`);
      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        setEmployees(employeesData.data || []);
      }
      
      // Загружаем площадки
      const platformsRes = await fetch(`/api/tenders/platforms?company_id=${companyId}`);
      if (platformsRes.ok) {
        const platformsData = await platformsRes.json();
        setPlatforms(platformsData.data || []);
      }
      
      setModalDataLoaded(true);
    } catch (error) {
      console.error('Error loading modal data:', error);
    }
  }, [companyId, modalDataLoaded]);

  const handleOpenSearchModal = async () => {
    await loadModalData();
    setIsSearchModalOpen(true);
  };

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
  const maxMonthlyCount = Math.max(...monthly.map(m => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дашборд тендеров</h1>
          <p className="text-sm text-muted-foreground">Аналитика и ключевые показатели</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button size="sm" onClick={handleOpenSearchModal}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Новый тендер
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего тендеров</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalTenders}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">{overview.activeTenders} активных</Badge>
              <span>На рассмотрении: {overview.pendingTenders}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выиграно</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.wonTenders}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={overview.winRate >= 50 ? "default" : "secondary"} className="text-xs">
                {overview.winRate.toFixed(0)}% побед
              </Badge>
              <span>Проиграно: {overview.lostTenders}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая НМЦК</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview.totalNmck)}</div>
            <p className="text-xs text-muted-foreground">
              Контракты: {formatCurrency(overview.totalContractPrice)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Экономия</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overview.totalSavings)}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {overview.totalNmck > 0 && (
                <Badge variant="outline" className="text-xs">
                  {((overview.totalSavings / overview.totalNmck) * 100).toFixed(1)}%
                </Badge>
              )}
              <span>Средний: {formatCurrency(overview.avgContractValue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* By Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">По этапам</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byStage.length > 0 ? (
              byStage.map(stage => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: stage.color }} 
                      />
                      <span>{stage.stage}</span>
                    </div>
                    <span className="font-medium">{stage.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div 
                      className="h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${stage.percent}%`,
                        backgroundColor: stage.color,
                      }} 
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mb-2" />
                <p className="text-sm">Нет данных</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">По типам</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {byType.length > 0 ? (
              byType.map((type, idx) => {
                const colors = ['#404040', '#525252', '#737373', '#a3a3a3', '#d4d4d4'];
                const color = colors[idx % colors.length];
                return (
                  <div key={type.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-2 w-2 rounded-full" 
                          style={{ backgroundColor: color }} 
                        />
                        <span>{type.type}</span>
                      </div>
                      <span className="font-medium">{type.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div 
                        className="h-2 rounded-full transition-all" 
                        style={{ 
                          width: `${type.percent}%`,
                          backgroundColor: color,
                        }} 
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mb-2" />
                <p className="text-sm">Нет данных</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Динамика за 12 месяцев</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-primary" />
              <span>Победы</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-destructive" />
              <span>Проигрыши</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-muted-foreground/30" />
              <span>В работе</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-1">
            {monthly.map(month => {
              const other = month.count - month.won - month.lost;
              const wonHeight = (month.won / maxMonthlyCount) * 100;
              const lostHeight = (month.lost / maxMonthlyCount) * 100;
              const otherHeight = (other / maxMonthlyCount) * 100;
              
              return (
                <div key={month.monthKey} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-24 w-full flex-col justify-end gap-0.5">
                    {month.won > 0 && (
                      <div 
                        className="w-full rounded-t-sm bg-primary" 
                        style={{ height: `${wonHeight}%` }}
                        title={`Выиграно: ${month.won}`}
                      />
                    )}
                    {other > 0 && (
                      <div 
                        className="w-full bg-muted-foreground/30" 
                        style={{ height: `${otherHeight}%` }}
                        title={`В работе: ${other}`}
                      />
                    )}
                    {month.lost > 0 && (
                      <div 
                        className="w-full rounded-b-sm bg-destructive" 
                        style={{ height: `${lostHeight}%` }}
                        title={`Проиграно: ${month.lost}`}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {month.month.split(' ')[0].slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Tenders */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Последние тендеры</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tenders/list">
                Все тендеры
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTenders.length > 0 ? (
              <div className="space-y-2">
                {recentTenders.map(tender => (
                  <Link 
                    key={tender.id} 
                    href={`/tenders/${tender.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div 
                      className="h-8 w-1 rounded-full" 
                      style={{ backgroundColor: tender.stageColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tender.customer}</p>
                      <p className="text-xs text-muted-foreground truncate">{tender.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(tender.nmck)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tender.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p className="text-sm">Нет тендеров</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Ближайшие сроки
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length > 0 ? (
                <div className="space-y-2">
                  {upcomingDeadlines.slice(0, 4).map(deadline => (
                    <Link 
                      key={deadline.id}
                      href={`/tenders/${deadline.id}`}
                      className="flex items-center gap-2 rounded-lg border p-2 transition-colors hover:bg-muted/50"
                    >
                      <div className={`flex h-10 w-10 flex-col items-center justify-center rounded text-xs font-medium ${
                        deadline.daysLeft <= 2 ? 'bg-destructive text-destructive-foreground' :
                        deadline.daysLeft <= 5 ? 'bg-yellow-500/10 text-yellow-600' :
                        'bg-muted'
                      }`}>
                        <span className="text-sm font-bold">{deadline.daysLeft}</span>
                        <span className="text-[8px]">дн</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{deadline.customer}</p>
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1 h-4"
                          style={{ borderColor: deadline.stageColor, color: deadline.stageColor }}
                        >
                          {deadline.stage}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
                  <CheckSquare className="h-6 w-6 mb-1" />
                  <p className="text-xs">Нет срочных дел</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Задачи</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tenders/tasks">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-2 text-center">
                  <p className="text-lg font-bold">{taskSummary.total}</p>
                  <p className="text-[10px] text-muted-foreground">Всего</p>
                </div>
                <div className="rounded-lg border p-2 text-center bg-primary/5">
                  <p className="text-lg font-bold">{taskSummary.inProgress}</p>
                  <p className="text-[10px] text-muted-foreground">В работе</p>
                </div>
                <div className="rounded-lg border p-2 text-center bg-green-500/5">
                  <p className="text-lg font-bold text-green-600">{taskSummary.completed}</p>
                  <p className="text-[10px] text-muted-foreground">Готово</p>
                </div>
                <div className="rounded-lg border p-2 text-center bg-destructive/5">
                  <p className="text-lg font-bold text-destructive">{taskSummary.overdue}</p>
                  <p className="text-[10px] text-muted-foreground">Просрочено</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Top Managers */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Топ менеджеров
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topManagers.length > 0 ? (
              <div className="space-y-2">
                {topManagers.map((manager, idx) => (
                  <div key={manager.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      idx === 0 ? 'bg-yellow-500/10 text-yellow-600' :
                      idx === 1 ? 'bg-gray-300/30 text-gray-600' :
                      idx === 2 ? 'bg-orange-500/10 text-orange-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {manager.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{manager.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{manager.totalTenders} тендеров</span>
                        <span>•</span>
                        <span>{manager.wonTenders} побед</span>
                        <span>•</span>
                        <span>{formatCurrency(manager.totalContractValue)}</span>
                      </div>
                    </div>
                    <Badge variant={manager.winRate >= 60 ? "default" : "secondary"}>
                      {manager.winRate.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <p className="text-sm">Нет данных</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto flex-col gap-1 py-4" asChild>
              <Link href="/tenders/department">
                <PlusCircle className="h-5 w-5" />
                <span className="text-xs">Новый тендер</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-4" asChild>
              <Link href="/tenders/tasks">
                <ListTodo className="h-5 w-5" />
                <span className="text-xs">Задачи</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-4" asChild>
              <Link href="/tenders/calendar">
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Календарь</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-1 py-4" asChild>
              <Link href="/tenders/list">
                <FileText className="h-5 w-5" />
                <span className="text-xs">Реестр</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Модалка поиска в ЕИС */}
      <TenderSearchEISModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onTenderFound={(data) => {
          setEisData(data);
          setIsFormModalOpen(true);
        }}
        onManualAdd={() => {
          setEisData(null);
          setIsSearchModalOpen(false);
          setIsFormModalOpen(true);
        }}
        companyId={companyId}
      />

      {/* Модалка создания тендера */}
      <TenderFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEisData(null);
        }}
        onSuccess={() => {
          setIsFormModalOpen(false);
          setEisData(null);
          handleRefresh();
          router.refresh();
        }}
        companyId={companyId}
        types={types}
        templates={templates}
        managers={employees}
        platforms={platforms}
        eisData={eisData}
      />
    </div>
  );
}
