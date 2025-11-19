"use client";

import { Shipment } from "@/types/logistics";
import { useState } from "react";
import { ShipmentsTable } from "./ShipmentsTable";
import { ShipmentFormModal } from "./ShipmentFormModal";
import type { ShipmentFormInput } from "@/lib/logistics/service";
import styles from "./ShipmentsManager.module.css";

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
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            🚚 Логистика
          </h1>
          <p className={styles.subtitle}>
            Управление отправками и доставками
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className={styles.addBtn}
        >
          <span className="material-icons">add</span>
          Новая отправка
        </button>
      </div>

      {/* Статистика */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📦</div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{shipments.length}</div>
            <div className={styles.statLabel}>Всего отправок</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🚛</div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {shipments.filter(s => s.status === 'in_transit').length}
            </div>
            <div className={styles.statLabel}>В пути</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {shipments.filter(s => s.status === 'delivered').length}
            </div>
            <div className={styles.statLabel}>Доставлено</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon}>⏰</div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>
              {shipments.filter(s => ['draft', 'confirmed'].includes(s.status)).length}
            </div>
            <div className={styles.statLabel}>В ожидании</div>
          </div>
        </div>
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
