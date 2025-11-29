import { notFound } from "next/navigation";
import { getShipment } from "@/lib/logistics/service";
import { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@/lib/utils/format";
import { SHIPMENT_STATUS_LABELS, SHIPMENT_TYPE_LABELS, STATUS_COLORS, ShipmentStatus, ShipmentType } from "@/types/logistics";
import styles from "./shipment-detail.module.css";

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
    <div className={styles.container}>
      {/* Навигация */}
      <Link href="/tenders/logistics" className={styles.backLink}>
        <span className="material-icons">arrow_back</span>
        Назад к списку
      </Link>

      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>
              📦 Отправка {shipment.tracking_number}
            </h1>
            <div className={styles.badges}>
              <span 
                className={styles.statusBadge}
                style={{ 
                  backgroundColor: `${statusColor}15`,
                  color: statusColor,
                  border: `1px solid ${statusColor}30`
                }}
              >
                {SHIPMENT_STATUS_LABELS[shipment.status as ShipmentStatus]}
              </span>
              <span className={styles.typeBadge}>
                {SHIPMENT_TYPE_LABELS[shipment.type as ShipmentType]}
              </span>
            </div>
          </div>
          <div className={styles.costSection}>
            <div className={styles.costValue}>
              {formatMoney(shipment.cost_amount, shipment.currency)}
            </div>
            <div className={styles.costLabel}>Стоимость доставки</div>
          </div>
        </div>
      </div>

      {/* Маршрут */}
      <div className={styles.grid}>
        {/* Отправитель */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={`material-icons ${styles.iconGreen}`}>location_on</span>
            Отправитель
          </h2>
          <div className={styles.contactInfo}>
            <div>
              <div className={styles.contactName}>{shipment.sender.name}</div>
              {shipment.sender.company && (
                <div className={styles.contactCompany}>{shipment.sender.company}</div>
              )}
            </div>
            <div className={styles.contactAddress}>
              <div>{shipment.sender_address.street}</div>
              <div>
                {shipment.sender_address.city}
                {shipment.sender_address.postal_code && `, ${shipment.sender_address.postal_code}`}
              </div>
              <div>{shipment.sender_address.country}</div>
            </div>
            {shipment.sender.phone && (
              <div className={styles.contactPhone}>{shipment.sender.phone}</div>
            )}
            {shipment.sender.email && (
              <div className={styles.contactEmail}>{shipment.sender.email}</div>
            )}
          </div>
        </div>

        {/* Получатель */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <span className={`material-icons ${styles.iconRed}`}>location_on</span>
            Получатель
          </h2>
          <div className={styles.contactInfo}>
            <div>
              <div className={styles.contactName}>{shipment.recipient.name}</div>
              {shipment.recipient.company && (
                <div className={styles.contactCompany}>{shipment.recipient.company}</div>
              )}
            </div>
            <div className={styles.contactAddress}>
              <div>{shipment.recipient_address.street}</div>
              <div>
                {shipment.recipient_address.city}
                {shipment.recipient_address.postal_code && `, ${shipment.recipient_address.postal_code}`}
              </div>
              <div>{shipment.recipient_address.country}</div>
            </div>
            {shipment.recipient.phone && (
              <div className={styles.contactPhone}>{shipment.recipient.phone}</div>
            )}
            {shipment.recipient.email && (
              <div className={styles.contactEmail}>{shipment.recipient.email}</div>
            )}
          </div>
        </div>
      </div>

      {/* Информация о грузе */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <h2 className={styles.cardTitle}>📋 Информация о грузе</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Описание</div>
            <div className={styles.infoValue}>{shipment.description}</div>
          </div>
          {shipment.weight_kg && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Вес</div>
              <div className={styles.infoValue}>{shipment.weight_kg} кг</div>
            </div>
          )}
          {shipment.dimensions && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Габариты (Д×Ш×В)</div>
              <div className={styles.infoValue}>
                {shipment.dimensions.length_cm} × {shipment.dimensions.width_cm} × {shipment.dimensions.height_cm} см
              </div>
            </div>
          )}
          {shipment.value_amount && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Объявленная стоимость</div>
              <div className={styles.infoValue}>{formatMoney(shipment.value_amount, shipment.currency)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Даты и дополнительная информация */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📅 Даты</h2>
          <div className={styles.datesList}>
            {shipment.pickup_date && (
              <div className={styles.dateItem}>
                <div className={styles.dateLabel}>Дата забора</div>
                <div className={styles.dateValue}>
                  {new Date(shipment.pickup_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
            )}
            {shipment.estimated_delivery && (
              <div className={styles.dateItem}>
                <div className={styles.dateLabel}>Ожидаемая доставка</div>
                <div className={styles.dateValue}>
                  {new Date(shipment.estimated_delivery).toLocaleDateString('ru-RU')}
                </div>
              </div>
            )}
            {shipment.delivery_date && (
              <div className={styles.dateItem}>
                <div className={styles.dateLabel}>Фактическая доставка</div>
                <div className={styles.dateValue}>
                  {new Date(shipment.delivery_date).toLocaleDateString('ru-RU')}
                </div>
              </div>
            )}
            <div className={styles.dateItem}>
              <div className={styles.dateLabel}>Создано</div>
              <div className={styles.dateValue}>
                {new Date(shipment.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          </div>
        </div>

        {(shipment.notes || shipment.special_instructions) && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>📝 Дополнительно</h2>
            <div className={styles.datesList}>
              {shipment.notes && (
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Примечания</div>
                  <div className={styles.infoValue}>{shipment.notes}</div>
                </div>
              )}
              {shipment.special_instructions && (
                <div className={styles.infoItem}>
                  <div className={styles.infoLabel}>Особые указания</div>
                  <div className={styles.infoValue}>{shipment.special_instructions}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className={styles.actions}>
        <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>
          <span className="material-icons">edit</span>
          Редактировать
        </button>
        <button className={styles.actionBtn}>
          <span className="material-icons">print</span>
          Печать накладной
        </button>
        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
          <span className="material-icons">delete</span>
          Удалить
        </button>
      </div>
    </div>
  );
}
