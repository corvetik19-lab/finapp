'use client';

import { useState, useMemo } from 'react';
import type { Shipment } from '@/types/logistics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Plus,
  Download,
  Printer,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { ShipmentFormModal } from './ShipmentFormModal';
import type { ShipmentFormInput } from '@/lib/logistics/service';

interface LogisticsListProps {
  initialShipments: Shipment[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждено',
  pending_pickup: 'Ожидает забора',
  picked_up: 'Забрано',
  in_transit: 'В пути',
  delivered: 'Доставлено',
  cancelled: 'Отменено',
  returned: 'Возврат',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  confirmed: 'secondary',
  pending_pickup: 'secondary',
  picked_up: 'default',
  in_transit: 'default',
  delivered: 'default',
  cancelled: 'destructive',
  returned: 'destructive',
};

export function LogisticsList({ initialShipments }: LogisticsListProps) {
  const [shipments, setShipments] = useState(initialShipments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Статистика
  const stats = useMemo(() => ({
    total: shipments.length,
    inTransit: shipments.filter((s) => s.status === 'in_transit').length,
    delivered: shipments.filter((s) => s.status === 'delivered').length,
    pending: shipments.filter((s) =>
      ['draft', 'confirmed', 'pending_pickup'].includes(s.status)
    ).length,
  }), [shipments]);

  // Фильтрация
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (searchValue) {
        const search = searchValue.toLowerCase();
        return (
          s.tracking_number?.toLowerCase().includes(search) ||
          s.sender?.name?.toLowerCase().includes(search) ||
          s.recipient?.name?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [shipments, statusFilter, searchValue]);

  const handleCreate = async (data: ShipmentFormInput): Promise<void> => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/logistics/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create shipment');

      const newShipment = await response.json();
      setShipments((prev) => [newShipment, ...prev]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить отправку?')) return;
    try {
      await fetch(`/api/logistics/shipments/${id}`, { method: 'DELETE' });
      setShipments((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const statusButtons = [
    { key: 'all', label: 'Все отправки', icon: Package },
    { key: 'draft', label: 'Черновик' },
    { key: 'confirmed', label: 'Подтверждено' },
    { key: 'picked_up', label: 'Забрано' },
    { key: 'in_transit', label: 'В пути' },
    { key: 'delivered', label: 'Доставлено' },
    { key: 'cancelled', label: 'Отменено' },
    { key: 'returned', label: 'Возврат' },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Логистика
          </h1>
          <p className="text-muted-foreground text-sm">
            Управление отправками и доставками
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Новая отправка
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Всего</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.inTransit}</p>
              <p className="text-sm text-muted-foreground">В пути</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.delivered}</p>
              <p className="text-sm text-muted-foreground">Доставлено</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">В ожидании</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Новая отправка
        </Button>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Экспорт
        </Button>
        <Button variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Печать накладных
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {statusButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={statusFilter === btn.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(btn.key)}
            >
              {btn.icon && <btn.icon className="mr-1 h-4 w-4" />}
              {btn.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по номеру, отправителю, получателю..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Показать фильтры
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Трек-номер</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Отправитель</TableHead>
            <TableHead>Получатель</TableHead>
            <TableHead>Маршрут</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Вес</TableHead>
            <TableHead>Стоимость</TableHead>
            <TableHead>Дата забора</TableHead>
            <TableHead>Доставка до</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredShipments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                Нет отправок
              </TableCell>
            </TableRow>
          ) : (
            filteredShipments.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell>
                  <Link
                    href={`/tenders/logistics/${shipment.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {shipment.tracking_number || '—'}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[shipment.status] || 'outline'}>
                    {STATUS_LABELS[shipment.status] || shipment.status}
                  </Badge>
                </TableCell>
                <TableCell>{shipment.sender?.name || '—'}</TableCell>
                <TableCell>{shipment.recipient?.name || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {shipment.sender_address?.city && shipment.recipient_address?.city
                    ? `${shipment.sender_address.city} → ${shipment.recipient_address.city}`
                    : '—'}
                </TableCell>
                <TableCell className="max-w-[150px] truncate">
                  {shipment.description || '—'}
                </TableCell>
                <TableCell>{shipment.weight_kg ? `${shipment.weight_kg} кг` : '—'}</TableCell>
                <TableCell>
                  {shipment.cost_amount
                    ? new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: shipment.currency || 'RUB',
                      }).format(shipment.cost_amount / 100)
                    : '—'}
                </TableCell>
                <TableCell>
                  {shipment.pickup_date
                    ? new Date(shipment.pickup_date).toLocaleDateString('ru-RU')
                    : '—'}
                </TableCell>
                <TableCell>
                  {shipment.estimated_delivery
                    ? new Date(shipment.estimated_delivery).toLocaleDateString('ru-RU')
                    : '—'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/tenders/logistics/${shipment.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Просмотр
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(shipment.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <p className="text-sm text-muted-foreground">
        Показано {filteredShipments.length} из {shipments.length} отправок
      </p>

      {/* Modal */}
      {isModalOpen && (
        <ShipmentFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
