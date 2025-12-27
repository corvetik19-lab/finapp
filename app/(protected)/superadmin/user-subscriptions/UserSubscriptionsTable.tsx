"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  MoreHorizontal, Search, AlertTriangle, Edit, XCircle, 
  RefreshCw, Pause, Play, Trash2
} from 'lucide-react';
import type { UserSubscriptionListItem, UserSubscriptionPlan } from '@/types/user-billing';
import { EditUserSubscriptionModal } from './EditUserSubscriptionModal';
import { toast } from 'sonner';

interface UserSubscriptionsTableProps {
  subscriptions: UserSubscriptionListItem[];
  plans: UserSubscriptionPlan[];
}

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Активна', variant: 'default' },
  trial: { label: 'Пробная', variant: 'secondary' },
  expired: { label: 'Истекла', variant: 'destructive' },
  cancelled: { label: 'Отменена', variant: 'outline' },
  past_due: { label: 'Просрочена', variant: 'destructive' },
  suspended: { label: 'Приостановлена', variant: 'outline' },
};

type SubscriptionAction = 'renew' | 'suspend' | 'resume' | 'cancel' | 'delete';

export function UserSubscriptionsTable({ subscriptions, plans }: UserSubscriptionsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingSubscription, setEditingSubscription] = useState<UserSubscriptionListItem | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: SubscriptionAction | null;
    subscription: UserSubscriptionListItem | null;
    title: string;
    description: string;
  }>({ open: false, action: null, subscription: null, title: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);

  const performAction = async (action: SubscriptionAction, subscriptionId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/superadmin/user-subscriptions/${subscriptionId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || 'Ошибка выполнения действия');
        return;
      }
      
      toast.success(data.message || 'Действие выполнено');
      router.refresh();
    } catch (_error) {
      toast.error('Ошибка сети');
    } finally {
      setIsLoading(false);
      setConfirmDialog({ open: false, action: null, subscription: null, title: '', description: '' });
    }
  };

  const openConfirmDialog = (
    action: SubscriptionAction,
    subscription: UserSubscriptionListItem,
    title: string,
    description: string
  ) => {
    setConfirmDialog({ open: true, action, subscription, title, description });
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = !search || 
      sub.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      sub.user?.full_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск по email или имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Все статусы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="trial">Пробные</SelectItem>
            <SelectItem value="expired">Истекшие</SelectItem>
            <SelectItem value="cancelled">Отменённые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Таблица */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Тариф</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Период</TableHead>
              <TableHead>Истекает</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {search || statusFilter !== 'all' 
                    ? 'Подписки не найдены' 
                    : 'Нет подписок пользователей'}
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscriptions.map((sub) => {
                const status = statusLabels[sub.status] || { label: sub.status, variant: 'outline' as const };
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">
                          {sub.user?.full_name || 'Без имени'}
                        </div>
                        <div className="text-sm text-gray-500">{sub.user?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sub.plan?.name || 'Без тарифа'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {sub.billing_period === 'yearly' ? 'Годовой' : 'Месячный'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {formatDate(sub.current_period_end)}
                        {sub.is_expiring_soon && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      {sub.days_until_expiry > 0 && (
                        <div className="text-xs text-gray-400">
                          через {sub.days_until_expiry} дн.
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(sub.amount)}
                      {sub.discount_percent > 0 && (
                        <div className="text-xs text-green-600">-{sub.discount_percent}%</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingSubscription(sub)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          
                          {/* Продление */}
                          {(sub.status === 'active' || sub.status === 'expired' || sub.status === 'cancelled') && (
                            <DropdownMenuItem onClick={() => openConfirmDialog(
                              'renew', sub,
                              'Продлить подписку?',
                              `Подписка для ${sub.user?.email} будет продлена на следующий период.`
                            )}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Продлить
                            </DropdownMenuItem>
                          )}
                          
                          {/* Приостановка */}
                          {(sub.status === 'active' || sub.status === 'trial') && (
                            <DropdownMenuItem onClick={() => openConfirmDialog(
                              'suspend', sub,
                              'Приостановить подписку?',
                              `Подписка для ${sub.user?.email} будет приостановлена. Пользователь потеряет доступ.`
                            )}>
                              <Pause className="h-4 w-4 mr-2" />
                              Приостановить
                            </DropdownMenuItem>
                          )}
                          
                          {/* Возобновление */}
                          {sub.status === 'suspended' && (
                            <DropdownMenuItem onClick={() => openConfirmDialog(
                              'resume', sub,
                              'Возобновить подписку?',
                              `Подписка для ${sub.user?.email} будет возобновлена.`
                            )}>
                              <Play className="h-4 w-4 mr-2" />
                              Возобновить
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          {/* Отмена */}
                          {sub.status !== 'cancelled' && sub.status !== 'expired' && (
                            <DropdownMenuItem 
                              className="text-amber-600"
                              onClick={() => openConfirmDialog(
                                'cancel', sub,
                                'Отменить подписку?',
                                `Подписка для ${sub.user?.email} будет отменена. Пользователь сохранит доступ до конца периода.`
                              )}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Отменить
                            </DropdownMenuItem>
                          )}
                          
                          {/* Удаление */}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => openConfirmDialog(
                              'delete', sub,
                              'Удалить подписку?',
                              `Подписка для ${sub.user?.email} будет полностью удалена. Это действие нельзя отменить!`
                            )}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Модальное окно редактирования */}
      {editingSubscription && (
        <EditUserSubscriptionModal
          subscription={editingSubscription}
          plans={plans}
          open={!!editingSubscription}
          onClose={() => setEditingSubscription(null)}
        />
      )}

      {/* Диалог подтверждения действия */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => {
        if (!open) setConfirmDialog({ open: false, action: null, subscription: null, title: '', description: '' });
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoading}
              onClick={() => {
                if (confirmDialog.action && confirmDialog.subscription) {
                  performAction(confirmDialog.action, confirmDialog.subscription.id);
                }
              }}
              className={confirmDialog.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isLoading ? 'Выполняется...' : 'Подтвердить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
