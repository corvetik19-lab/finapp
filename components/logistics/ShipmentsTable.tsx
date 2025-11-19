"use client";

import { Shipment, SHIPMENT_STATUS_LABELS, ShipmentStatus, STATUS_COLORS } from "@/types/logistics";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateShipmentStatus, deleteShipment } from "@/lib/logistics/service";
import { formatMoney } from "@/lib/utils/format";
import styles from "./ShipmentsTable.module.css";

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
      await deleteShipment(id);
      setShipments(prev => prev.filter(s => s.id !== id));
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Ошибка при удалении');
    }
  };

  const handleStatusChange = async (shipment: Shipment, newStatus: ShipmentStatus) => {
    try {
      const updated = await updateShipmentStatus(shipment.id, newStatus);
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
    <div className={styles.container}>
      {/* Табы фильтрации */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`}
          onClick={() => setFilter('all')}
        >
          🚚 Все отправки
          {shipments.length > 0 && <span className={styles.badge}>{shipments.length}</span>}
        </button>
        
        {Object.entries(SHIPMENT_STATUS_LABELS).map(([status, label]) => (
          <button
            key={status}
            className={`${styles.tab} ${filter === status ? styles.activeTab : ''}`}
            onClick={() => setFilter(status as ShipmentStatus)}
            style={{ 
              '--status-color': STATUS_COLORS[status as ShipmentStatus] 
            } as React.CSSProperties}
          >
            {label}
            {statusCounts[status as ShipmentStatus] > 0 && (
              <span className={styles.badge}>
                {statusCounts[status as ShipmentStatus]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Панель управления */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Поиск по номеру, отправителю, получателю..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button
          className={styles.filterBtn}
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="material-icons">filter_list</span>
          {showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}
        </button>
      </div>

      {/* Таблица */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Трек-номер</th>
              <th>Статус</th>
              <th>Отправитель</th>
              <th>Получатель</th>
              <th>Маршрут</th>
              <th>Описание груза</th>
              <th>Вес</th>
              <th>Стоимость</th>
              <th>Дата забора</th>
              <th>Доставка до</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.length === 0 ? (
              <tr>
                <td colSpan={11} className={styles.empty}>
                  {searchQuery ? 'Ничего не найдено' : 'Нет отправок'}
                </td>
              </tr>
            ) : (
              filteredShipments.map((shipment) => (
                <tr key={shipment.id} className={styles.row}>
                  <td className={styles.trackingCell}>
                    <div className={styles.trackingNumber}>
                      {shipment.tracking_number}
                    </div>
                    <div className={styles.shipmentType}>
                      {shipment.type === 'express' && '⚡'}
                      {shipment.type === 'overnight' && '🌙'}
                      {shipment.type === 'freight' && '📦'}
                      {shipment.type === 'standard' && '📋'}
                    </div>
                  </td>
                  
                  <td>
                    <select
                      value={shipment.status}
                      onChange={(e) => handleStatusChange(shipment, e.target.value as ShipmentStatus)}
                      className={styles.statusSelect}
                      style={{ 
                        backgroundColor: STATUS_COLORS[shipment.status],
                        color: 'white'
                      }}
                    >
                      {Object.entries(SHIPMENT_STATUS_LABELS).map(([status, label]) => (
                        <option key={status} value={status}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  <td className={styles.contactCell}>
                    <div className={styles.contactName}>{shipment.sender.name}</div>
                    {shipment.sender.company && (
                      <div className={styles.contactCompany}>{shipment.sender.company}</div>
                    )}
                    {shipment.sender.phone && (
                      <div className={styles.contactPhone}>{shipment.sender.phone}</div>
                    )}
                  </td>
                  
                  <td className={styles.contactCell}>
                    <div className={styles.contactName}>{shipment.recipient.name}</div>
                    {shipment.recipient.company && (
                      <div className={styles.contactCompany}>{shipment.recipient.company}</div>
                    )}
                    {shipment.recipient.phone && (
                      <div className={styles.contactPhone}>{shipment.recipient.phone}</div>
                    )}
                  </td>
                  
                  <td className={styles.routeCell}>
                    <div className={styles.routeFrom}>
                      📍 {shipment.sender_address.city}
                    </div>
                    <div className={styles.routeArrow}>↓</div>
                    <div className={styles.routeTo}>
                      🏁 {shipment.recipient_address.city}
                    </div>
                  </td>
                  
                  <td className={styles.descriptionCell}>
                    <span title={shipment.description}>
                      {shipment.description.length > 50 
                        ? `${shipment.description.slice(0, 50)}...` 
                        : shipment.description}
                    </span>
                  </td>
                  
                  <td>
                    {shipment.weight_kg ? `${shipment.weight_kg} кг` : '—'}
                  </td>
                  
                  <td className={styles.amountCell}>
                    {formatMoney(shipment.cost_amount, shipment.currency)}
                  </td>
                  
                  <td>
                    {shipment.pickup_date 
                      ? new Date(shipment.pickup_date).toLocaleDateString('ru-RU')
                      : '—'}
                  </td>
                  
                  <td>
                    {shipment.estimated_delivery 
                      ? new Date(shipment.estimated_delivery).toLocaleDateString('ru-RU')
                      : '—'}
                  </td>
                  
                  <td className={styles.actions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => router.push(`/logistics/shipments/${shipment.id}`)}
                      title="Подробнее"
                    >
                      <span className="material-icons">visibility</span>
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleDelete(shipment.id)}
                      title="Удалить"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Информация о результатах */}
      <div className={styles.resultsInfo}>
        Показано {filteredShipments.length} из {shipments.length} отправок
      </div>
    </div>
  );
}
