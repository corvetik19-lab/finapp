"use client";

import { Shipment, SHIPMENT_STATUS_LABELS, ShipmentStatus } from "@/types/logistics";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Eye, Pencil, Trash2, Truck } from "lucide-react";

interface ShipmentsTableProps {
  initialShipments: Shipment[];
}

export function ShipmentsTable({ initialShipments }: ShipmentsTableProps) {
  const router = useRouter();
  const [shipments, setShipments] = useState(initialShipments);
  const [filter, setFilter] = useState<ShipmentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setShipments(initialShipments);
  }, [initialShipments]);

  const filteredShipments = shipments.filter(shipment => {
    // Фильтр по статусу
    if (filter !== 'all' && shipment.status !== filter) return false;
    
    // Поиск по текстовым полям
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        shipment.tracking_number.toLowerCase().includes(query) ||
        shipment.sender.name.toLowerCase().includes(query) ||
        shipment.recipient.name.toLowerCase().includes(query) ||
        shipment.description.toLowerCase().includes(query) ||
        shipment.sender_address.city.toLowerCase().includes(query) ||
        shipment.recipient_address.city.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту отправку?')) return;
    try {
      const response = await fetch(`/api/logistics/shipments/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete shipment');
      }
      
      setShipments(prev => prev.filter(s => s.id !== id));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении');
    }
  };

  const handleStatusChange = async (shipment: Shipment, newStatus: ShipmentStatus) => {
    try {
      const response = await fetch(`/api/logistics/shipments/${shipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      const updated = await response.json();
      setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при изменении статуса');
    }
  };

  // Подсчёт количества отправок по статусам
  const statusCounts = shipments.reduce((acc, shipment) => {
    acc[shipment.status] = (acc[shipment.status] || 0) + 1;
    return acc;
  }, {} as Record<ShipmentStatus, number>);

  return (
    <div className="space-y-4">
      {/* Табы фильтрации */}
      <div className="flex flex-wrap gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          <Truck className="h-4 w-4 mr-1" />Все отправки{shipments.length > 0 && <Badge variant="secondary" className="ml-1">{shipments.length}</Badge>}
        </Button>
        {Object.entries(SHIPMENT_STATUS_LABELS).map(([status, label]) => (
          <Button key={status} variant={filter === status ? 'default' : 'outline'} size="sm" onClick={() => setFilter(status as ShipmentStatus)}>
            {label}{statusCounts[status as ShipmentStatus] > 0 && <Badge variant="secondary" className="ml-1">{statusCounts[status as ShipmentStatus]}</Badge>}
          </Button>
        ))}
      </div>

      {/* Панель управления */}
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Поиск по номеру, отправителю, получателю..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-1" />{showFilters ? 'Скрыть' : 'Фильтры'}</Button>
      </div>

      {/* Таблица */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Трек-номер</TableHead><TableHead>Статус</TableHead><TableHead>Отправитель</TableHead><TableHead>Получатель</TableHead><TableHead>Маршрут</TableHead><TableHead>Описание</TableHead><TableHead>Вес</TableHead><TableHead>Стоимость</TableHead><TableHead>Забор</TableHead><TableHead>Доставка</TableHead><TableHead className="w-28">Действия</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredShipments.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">{searchQuery ? 'Ничего не найдено' : 'Нет отправок'}</TableCell></TableRow>
            ) : (
              filteredShipments.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell><div className="font-mono font-medium">{shipment.tracking_number}</div><div className="text-xs">{shipment.type === 'express' && '⚡'}{shipment.type === 'overnight' && '🌙'}{shipment.type === 'freight' && '📦'}{shipment.type === 'standard' && '📋'}</div></TableCell>
                  <TableCell><Select value={shipment.status} onValueChange={(v) => handleStatusChange(shipment, v as ShipmentStatus)}><SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SHIPMENT_STATUS_LABELS).map(([status, label]) => <SelectItem key={status} value={status}>{label}</SelectItem>)}</SelectContent></Select></TableCell>
                  <TableCell><div className="text-sm font-medium">{shipment.sender.name}</div>{shipment.sender.company && <div className="text-xs text-muted-foreground">{shipment.sender.company}</div>}{shipment.sender.phone && <div className="text-xs text-muted-foreground">{shipment.sender.phone}</div>}</TableCell>
                  <TableCell><div className="text-sm font-medium">{shipment.recipient.name}</div>{shipment.recipient.company && <div className="text-xs text-muted-foreground">{shipment.recipient.company}</div>}{shipment.recipient.phone && <div className="text-xs text-muted-foreground">{shipment.recipient.phone}</div>}</TableCell>
                  <TableCell><div className="text-xs">📍 {shipment.sender_address.city}</div><div className="text-xs text-muted-foreground">↓</div><div className="text-xs">🏁 {shipment.recipient_address.city}</div></TableCell>
                  <TableCell className="max-w-32"><span className="text-sm line-clamp-2" title={shipment.description}>{shipment.description}</span></TableCell>
                  <TableCell className="text-sm">{shipment.weight_kg ? `${shipment.weight_kg} кг` : '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{formatMoney(shipment.cost_amount, shipment.currency)}</TableCell>
                  <TableCell className="text-sm">{shipment.pickup_date ? new Date(shipment.pickup_date).toLocaleDateString('ru-RU') : '—'}</TableCell>
                  <TableCell className="text-sm">{shipment.estimated_delivery ? new Date(shipment.estimated_delivery).toLocaleDateString('ru-RU') : '—'}</TableCell>
                  <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => router.push(`/tenders/logistics/${shipment.id}`)} title="Подробнее"><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => router.push(`/tenders/logistics/${shipment.id}`)} title="Редактировать"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(shipment.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Информация о результатах */}
      <div className="text-sm text-muted-foreground">Показано {filteredShipments.length} из {shipments.length} отправок</div>
    </div>
  );
}
