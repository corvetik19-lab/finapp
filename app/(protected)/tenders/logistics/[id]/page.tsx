import { notFound } from "next/navigation";
import { getShipment } from "@/lib/logistics/service";
import { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/utils/format";
import { SHIPMENT_STATUS_LABELS, SHIPMENT_TYPE_LABELS, STATUS_COLORS, ShipmentStatus, ShipmentType } from "@/types/logistics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Printer, Trash2, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Детали отправки | Логистика",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const shipment = await getShipment(id);

  if (!shipment) {
    notFound();
  }

  const statusColor = STATUS_COLORS[shipment.status as ShipmentStatus] || "#6b7280";

  return (
    <div className="p-6 space-y-6">
      <Link href="/tenders/logistics"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-1" />Назад</Button></Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">📦 Отправка {shipment.tracking_number}</h1>
          <div className="flex gap-2 mt-2">
            <Badge style={{ backgroundColor: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30` }}>{SHIPMENT_STATUS_LABELS[shipment.status as ShipmentStatus]}</Badge>
            <Badge variant="secondary">{SHIPMENT_TYPE_LABELS[shipment.type as ShipmentType]}</Badge>
          </div>
        </div>
        <div className="text-right"><div className="text-2xl font-bold">{formatMoney(shipment.cost_amount, shipment.currency)}</div><div className="text-sm text-muted-foreground">Стоимость доставки</div></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4 text-green-600" />Отправитель</CardTitle></CardHeader><CardContent className="space-y-2">
          <p className="font-medium">{shipment.sender.name}</p>
          {shipment.sender.company && <p className="text-sm text-muted-foreground">{shipment.sender.company}</p>}
          <div className="text-sm"><p>{shipment.sender_address.street}</p><p>{shipment.sender_address.city}{shipment.sender_address.postal_code && `, ${shipment.sender_address.postal_code}`}</p><p>{shipment.sender_address.country}</p></div>
          {shipment.sender.phone && <p className="text-sm">{shipment.sender.phone}</p>}
          {shipment.sender.email && <p className="text-sm text-muted-foreground">{shipment.sender.email}</p>}
        </CardContent></Card>

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4 text-red-600" />Получатель</CardTitle></CardHeader><CardContent className="space-y-2">
          <p className="font-medium">{shipment.recipient.name}</p>
          {shipment.recipient.company && <p className="text-sm text-muted-foreground">{shipment.recipient.company}</p>}
          <div className="text-sm"><p>{shipment.recipient_address.street}</p><p>{shipment.recipient_address.city}{shipment.recipient_address.postal_code && `, ${shipment.recipient_address.postal_code}`}</p><p>{shipment.recipient_address.country}</p></div>
          {shipment.recipient.phone && <p className="text-sm">{shipment.recipient.phone}</p>}
          {shipment.recipient.email && <p className="text-sm text-muted-foreground">{shipment.recipient.email}</p>}
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>📋 Информация о грузе</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-2 gap-4">
        <div><p className="text-sm text-muted-foreground">Описание</p><p className="font-medium">{shipment.description}</p></div>
        {shipment.weight_kg && <div><p className="text-sm text-muted-foreground">Вес</p><p className="font-medium">{shipment.weight_kg} кг</p></div>}
        {shipment.dimensions && <div><p className="text-sm text-muted-foreground">Габариты</p><p className="font-medium">{shipment.dimensions.length_cm} × {shipment.dimensions.width_cm} × {shipment.dimensions.height_cm} см</p></div>}
        {shipment.value_amount && <div><p className="text-sm text-muted-foreground">Объявленная стоимость</p><p className="font-medium">{formatMoney(shipment.value_amount, shipment.currency)}</p></div>}
      </div></CardContent></Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>📅 Даты</CardTitle></CardHeader><CardContent className="space-y-3">
          {shipment.pickup_date && <div><p className="text-sm text-muted-foreground">Дата забора</p><p className="font-medium">{new Date(shipment.pickup_date).toLocaleDateString('ru-RU')}</p></div>}
          {shipment.estimated_delivery && <div><p className="text-sm text-muted-foreground">Ожидаемая доставка</p><p className="font-medium">{new Date(shipment.estimated_delivery).toLocaleDateString('ru-RU')}</p></div>}
          {shipment.delivery_date && <div><p className="text-sm text-muted-foreground">Фактическая доставка</p><p className="font-medium">{new Date(shipment.delivery_date).toLocaleDateString('ru-RU')}</p></div>}
          <div><p className="text-sm text-muted-foreground">Создано</p><p className="font-medium">{new Date(shipment.created_at).toLocaleDateString('ru-RU')}</p></div>
        </CardContent></Card>

        {(shipment.notes || shipment.special_instructions) && <Card><CardHeader><CardTitle>📝 Дополнительно</CardTitle></CardHeader><CardContent className="space-y-3">
          {shipment.notes && <div><p className="text-sm text-muted-foreground">Примечания</p><p>{shipment.notes}</p></div>}
          {shipment.special_instructions && <div><p className="text-sm text-muted-foreground">Особые указания</p><p>{shipment.special_instructions}</p></div>}
        </CardContent></Card>}
      </div>

      <div className="flex gap-2">
        <Button><Edit className="h-4 w-4 mr-1" />Редактировать</Button>
        <Button variant="outline"><Printer className="h-4 w-4 mr-1" />Печать</Button>
        <Button variant="destructive"><Trash2 className="h-4 w-4 mr-1" />Удалить</Button>
      </div>
    </div>
  );
}
