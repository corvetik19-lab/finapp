import { notFound } from "next/navigation";
import { getShipment } from "@/lib/logistics/service";
import { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/utils/format";
import { SHIPMENT_STATUS_LABELS, SHIPMENT_TYPE_LABELS, STATUS_COLORS, ShipmentStatus, ShipmentType } from "@/types/logistics";

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
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {/* Навигация */}
      <div className="mb-6">
        <Link 
          href="/tenders/logistics"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="material-icons text-lg">arrow_back</span>
          Назад к списку
        </Link>
      </div>

      {/* Заголовок */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Отправка {shipment.tracking_number}
            </h1>
            <div className="flex items-center gap-3">
              <span 
                className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium"
                style={{ 
                  backgroundColor: `${statusColor}15`,
                  color: statusColor,
                  border: `1px solid ${statusColor}30`
                }}
              >
                {SHIPMENT_STATUS_LABELS[shipment.status as ShipmentStatus]}
              </span>
              <span className="text-sm text-gray-500">
                {SHIPMENT_TYPE_LABELS[shipment.type as ShipmentType]}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-gray-900">
              {formatMoney(shipment.cost_amount, shipment.currency)}
            </div>
            <div className="text-sm text-gray-500">Стоимость доставки</div>
          </div>
        </div>
      </div>

      {/* Маршрут */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Отправитель */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-icons text-green-600">location_on</span>
            Отправитель
          </h2>
          <div className="space-y-2">
            <div>
              <div className="font-medium text-gray-900">{shipment.sender.name}</div>
              {shipment.sender.company && (
                <div className="text-sm text-gray-600">{shipment.sender.company}</div>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <div>{shipment.sender_address.street}</div>
              <div>
                {shipment.sender_address.city}
                {shipment.sender_address.postal_code && `, ${shipment.sender_address.postal_code}`}
              </div>
              <div>{shipment.sender_address.country}</div>
            </div>
            {shipment.sender.phone && (
              <div className="text-sm text-gray-600 font-mono">{shipment.sender.phone}</div>
            )}
            {shipment.sender.email && (
              <div className="text-sm text-gray-600">{shipment.sender.email}</div>
            )}
          </div>
        </div>

        {/* Получатель */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="material-icons text-red-600">location_on</span>
            Получатель
          </h2>
          <div className="space-y-2">
            <div>
              <div className="font-medium text-gray-900">{shipment.recipient.name}</div>
              {shipment.recipient.company && (
                <div className="text-sm text-gray-600">{shipment.recipient.company}</div>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <div>{shipment.recipient_address.street}</div>
              <div>
                {shipment.recipient_address.city}
                {shipment.recipient_address.postal_code && `, ${shipment.recipient_address.postal_code}`}
              </div>
              <div>{shipment.recipient_address.country}</div>
            </div>
            {shipment.recipient.phone && (
              <div className="text-sm text-gray-600 font-mono">{shipment.recipient.phone}</div>
            )}
            {shipment.recipient.email && (
              <div className="text-sm text-gray-600">{shipment.recipient.email}</div>
            )}
          </div>
        </div>
      </div>

      {/* Информация о грузе */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о грузе</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">Описание</div>
            <div className="text-gray-900">{shipment.description}</div>
          </div>
          {shipment.weight_kg && (
            <div>
              <div className="text-sm text-gray-600 mb-1">Вес</div>
              <div className="text-gray-900">{shipment.weight_kg} кг</div>
            </div>
          )}
          {shipment.dimensions && (
            <div>
              <div className="text-sm text-gray-600 mb-1">Габариты (Д×Ш×В)</div>
              <div className="text-gray-900">
                {shipment.dimensions.length_cm} × {shipment.dimensions.width_cm} × {shipment.dimensions.height_cm} см
              </div>
            </div>
          )}
          {shipment.value_amount && (
            <div>
              <div className="text-sm text-gray-600 mb-1">Объявленная стоимость</div>
              <div className="text-gray-900">{formatMoney(shipment.value_amount, shipment.currency)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Даты и дополнительная информация */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Даты</h2>
          <div className="space-y-3">
            {shipment.pickup_date && (
              <div>
                <div className="text-sm text-gray-600">Дата забора</div>
                <div className="text-gray-900">
                  {new Date(shipment.pickup_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
            )}
            {shipment.estimated_delivery && (
              <div>
                <div className="text-sm text-gray-600">Ожидаемая доставка</div>
                <div className="text-gray-900">
                  {new Date(shipment.estimated_delivery).toLocaleDateString('ru-RU')}
                </div>
              </div>
            )}
            {shipment.delivery_date && (
              <div>
                <div className="text-sm text-gray-600">Фактическая доставка</div>
                <div className="text-gray-900">
                  {new Date(shipment.delivery_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-600">Создано</div>
              <div className="text-gray-900">
                {new Date(shipment.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          </div>
        </div>

        {(shipment.notes || shipment.special_instructions) && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Дополнительно</h2>
            <div className="space-y-3">
              {shipment.notes && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Примечания</div>
                  <div className="text-gray-900">{shipment.notes}</div>
                </div>
              )}
              {shipment.special_instructions && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Особые указания</div>
                  <div className="text-gray-900">{shipment.special_instructions}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
