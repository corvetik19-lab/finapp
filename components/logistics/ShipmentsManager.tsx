"use client";

import { Shipment } from "@/types/logistics";
import { useState } from "react";
import { ShipmentsTable } from "./ShipmentsTable";
import { ShipmentFormModal } from "./ShipmentFormModal";
import type { ShipmentFormInput } from "@/lib/logistics/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Plus, Download, Printer, Package, CircleCheck, Clock } from "lucide-react";

interface ShipmentsManagerProps {
  initialShipments: Shipment[];
}

export function ShipmentsManager({ initialShipments }: ShipmentsManagerProps) {
  const [shipments, setShipments] = useState(initialShipments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (data: ShipmentFormInput): Promise<void> => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/logistics/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create shipment');
      }
      
      const newShipment = await response.json();
      setShipments(prev => [newShipment, ...prev]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating shipment:', error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6" />Логистика</h1><p className="text-sm text-muted-foreground">Управление отправками и доставками</p></div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4 mr-1" />Новая отправка</Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Package className="h-5 w-5 text-blue-500" /><div><div className="text-xl font-bold">{shipments.length}</div><div className="text-xs text-muted-foreground">Всего отправок</div></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Truck className="h-5 w-5 text-orange-500" /><div><div className="text-xl font-bold">{shipments.filter(s => s.status === 'in_transit').length}</div><div className="text-xs text-muted-foreground">В пути</div></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><CircleCheck className="h-5 w-5 text-green-500" /><div><div className="text-xl font-bold">{shipments.filter(s => s.status === 'delivered').length}</div><div className="text-xs text-muted-foreground">Доставлено</div></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-5 w-5 text-amber-500" /><div><div className="text-xl font-bold">{shipments.filter(s => ['draft', 'confirmed', 'pending_pickup'].includes(s.status)).length}</div><div className="text-xs text-muted-foreground">В ожидании</div></div></CardContent></Card>
      </div>

      {/* Быстрые действия */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setIsModalOpen(true)}><Plus className="h-4 w-4 mr-1" />Новая отправка</Button>
        <Button variant="outline"><Download className="h-4 w-4 mr-1" />Экспорт</Button>
        <Button variant="outline"><Printer className="h-4 w-4 mr-1" />Печать накладных</Button>
      </div>

      {/* Таблица */}
      <ShipmentsTable initialShipments={shipments} />

      {/* Модальное окно */}
      {isModalOpen && (
        <ShipmentFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreate}
          isSubmitting={isCreating}
        />
      )}
    </div>
  );
}
