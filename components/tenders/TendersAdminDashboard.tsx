'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  RefreshCw, 
  UserPlus, 
  AlertTriangle,
  FileText,
  Users,
  Clock,
  BarChart3
} from 'lucide-react';
import { TenderStageTimer } from './TenderStageTimer';
import { QuickAssignModal } from './QuickAssignModal';

interface Employee {
  id: string;
  full_name: string;
  role_name?: string;
  role_color?: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  order_index: number;
}

interface Tender {
  id: string;
  purchase_number: string;
  subject: string;
  customer: string;
  initial_price: number;
  stage_id: string;
  stage?: Stage;
  assigned_employees: Employee[];
  stage_entered_at?: string;
  time_on_stage_seconds?: number;
  is_stuck?: boolean;
}

interface StageStats {
  stage_id: string;
  stage_name: string;
  stage_color: string;
  count: number;
  avg_time_seconds: number;
}

interface AdminOverviewData {
  tenders: Tender[];
  free_tenders: Tender[];
  stages: Stage[];
  stage_stats: StageStats[];
  stuck_tenders: Tender[];
  total_count: number;
  free_count: number;
  stuck_count: number;
}

interface TendersAdminDashboardProps {
  companyId: string;
}

export function TendersAdminDashboard({ companyId }: TendersAdminDashboardProps) {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tenders/admin-overview?company_id=${companyId}`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error loading admin overview:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignClick = (tender: Tender) => {
    setSelectedTender(tender);
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = () => {
    loadData();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(price / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-red-600">{error}</p>
        <Button onClick={loadData} variant="outline">
          Повторить
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Заголовок и действия */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Обзор тендеров</h1>
          <p className="text-sm text-gray-500">Управление назначениями и аналитика</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Всего тендеров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.total_count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Свободные
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{data.free_count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Застряли
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{data.stuck_count}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Этапов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.stages.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Статистика по этапам */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Распределение по этапам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {data.stage_stats.map((stat) => (
              <div 
                key={stat.stage_id} 
                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                style={{ borderColor: stat.stage_color }}
              >
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stat.stage_color }}
                />
                <span className="font-medium">{stat.stage_name}</span>
                <Badge variant="secondary">{stat.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Табы с контентом */}
      <Tabs defaultValue="free" className="w-full">
        <TabsList>
          <TabsTrigger value="free" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Свободные ({data.free_count})
          </TabsTrigger>
          <TabsTrigger value="stuck" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Застрявшие ({data.stuck_count})
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            Все ({data.total_count})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="free" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Свободные тендеры</CardTitle>
              <CardDescription>
                Тендеры без назначенных сотрудников — требуют назначения
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.free_tenders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Все тендеры назначены сотрудникам
                </p>
              ) : (
                <TenderTable 
                  tenders={data.free_tenders} 
                  onAssign={handleAssignClick}
                  formatPrice={formatPrice}
                  showAssignButton
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stuck" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Застрявшие тендеры</CardTitle>
              <CardDescription>
                Тендеры, находящиеся на одном этапе более 3 дней
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.stuck_tenders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Нет застрявших тендеров
                </p>
              ) : (
                <TenderTable 
                  tenders={data.stuck_tenders} 
                  onAssign={handleAssignClick}
                  formatPrice={formatPrice}
                  showTimer
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Все тендеры</CardTitle>
            </CardHeader>
            <CardContent>
              <TenderTable 
                tenders={data.tenders} 
                onAssign={handleAssignClick}
                formatPrice={formatPrice}
                showTimer
                showAssignButton
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Модал назначения */}
      <QuickAssignModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onSuccess={handleAssignSuccess}
        tender={selectedTender ? {
          id: selectedTender.id,
          purchase_number: selectedTender.purchase_number,
          subject: selectedTender.subject,
          customer: selectedTender.customer,
          stage: selectedTender.stage
        } : null}
        companyId={companyId}
      />
    </div>
  );
}

interface TenderTableProps {
  tenders: Tender[];
  onAssign: (tender: Tender) => void;
  formatPrice: (price: number) => string;
  showTimer?: boolean;
  showAssignButton?: boolean;
}

function TenderTable({ 
  tenders, 
  onAssign, 
  formatPrice,
  showTimer = false,
  showAssignButton = false
}: TenderTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Номер</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Предмет</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Заказчик</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Этап</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Сотрудники</th>
            {showTimer && (
              <th className="text-left py-3 px-4 font-medium text-gray-500">
                <Clock className="h-4 w-4 inline mr-1" />
                Время
              </th>
            )}
            <th className="text-right py-3 px-4 font-medium text-gray-500">Сумма</th>
            {showAssignButton && (
              <th className="text-right py-3 px-4 font-medium text-gray-500">Действия</th>
            )}
          </tr>
        </thead>
        <tbody>
          {tenders.map((tender) => (
            <tr key={tender.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">
                <span className="font-mono text-sm">{tender.purchase_number}</span>
              </td>
              <td className="py-3 px-4">
                <span className="line-clamp-2 text-sm">{tender.subject}</span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-gray-600">{tender.customer}</span>
              </td>
              <td className="py-3 px-4">
                {tender.stage && (
                  <Badge 
                    variant="outline"
                    style={{ 
                      borderColor: tender.stage.color,
                      color: tender.stage.color 
                    }}
                  >
                    {tender.stage.name}
                  </Badge>
                )}
              </td>
              <td className="py-3 px-4">
                {tender.assigned_employees.length === 0 ? (
                  <span className="text-gray-400 text-sm">Не назначен</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {tender.assigned_employees.map((emp) => (
                      <Badge 
                        key={emp.id} 
                        variant="secondary"
                        className="text-xs"
                        style={emp.role_color ? {
                          backgroundColor: `${emp.role_color}20`,
                          color: emp.role_color
                        } : undefined}
                      >
                        {emp.full_name}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
              {showTimer && (
                <td className="py-3 px-4">
                  {tender.stage_entered_at && (
                    <TenderStageTimer 
                      enteredAt={tender.stage_entered_at}
                      warningThresholdDays={3}
                    />
                  )}
                </td>
              )}
              <td className="py-3 px-4 text-right">
                <span className="font-medium">{formatPrice(tender.initial_price)}</span>
              </td>
              {showAssignButton && (
                <td className="py-3 px-4 text-right">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onAssign(tender)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Назначить
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
