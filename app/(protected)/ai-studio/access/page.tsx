"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

interface AccessRecord {
  id: string;
  organization_id: string;
  organization_name?: string;
  granted_at: string;
  expires_at: string | null;
  is_active: boolean;
}

interface Organization {
  id: string;
  name: string;
}

export default function AIAccessPage() {
  const [accessList, setAccessList] = useState<AccessRecord[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accessRes, orgsRes] = await Promise.all([
        fetch("/api/ai-studio/access"),
        fetch("/api/organizations"),
      ]);

      if (accessRes.ok) {
        const data = await accessRes.json();
        setAccessList(data.access || []);
      }

      if (orgsRes.ok) {
        const data = await orgsRes.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrant = async () => {
    if (!selectedOrg) return;

    try {
      const res = await fetch("/api/ai-studio/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedOrg }),
      });

      if (res.ok) {
        setShowGrantModal(false);
        setSelectedOrg("");
        loadData();
      }
    } catch (error) {
      console.error("Error granting access:", error);
    }
  };

  const handleRevoke = async (accessId: string) => {
    if (!confirm("Отозвать доступ к AI Studio?")) return;

    try {
      const res = await fetch(`/api/ai-studio/access/${accessId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Error revoking access:", error);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span className="material-icons">hourglass_empty</span>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>
            <span className="material-icons">admin_panel_settings</span>
            Управление доступом
          </h1>
          <p>Выдача доступа к AI Studio для организаций</p>
        </div>
        <button
          className={styles.grantButton}
          onClick={() => setShowGrantModal(true)}
        >
          <span className="material-icons">add</span>
          Выдать доступ
        </button>
      </div>

      <div className={styles.notice}>
        <span className="material-icons">info</span>
        <p>
          Только <strong>Super Admin</strong> (corvetik1@yandex.ru) может управлять
          доступом к AI Studio. Организации с доступом смогут использовать все
          функции Gemini.
        </p>
      </div>

      <div className={styles.accessList}>
        <h2>Организации с доступом</h2>

        {accessList.length === 0 ? (
          <div className={styles.empty}>
            <span className="material-icons">group_off</span>
            <p>Нет организаций с доступом</p>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Организация</span>
              <span>Дата выдачи</span>
              <span>Статус</span>
              <span>Действия</span>
            </div>
            {accessList.map((record) => (
              <div key={record.id} className={styles.tableRow}>
                <span className={styles.orgName}>
                  <span className="material-icons">business</span>
                  {record.organization_name || record.organization_id}
                </span>
                <span>
                  {new Date(record.granted_at).toLocaleDateString("ru-RU")}
                </span>
                <span>
                  <span
                    className={`${styles.status} ${record.is_active ? styles.active : styles.inactive}`}
                  >
                    {record.is_active ? "Активен" : "Отключён"}
                  </span>
                </span>
                <span>
                  <button
                    className={styles.revokeButton}
                    onClick={() => handleRevoke(record.id)}
                  >
                    <span className="material-icons">block</span>
                    Отозвать
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showGrantModal && (
        <div className={styles.modalOverlay} onClick={() => setShowGrantModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Выдать доступ к AI Studio</h3>
            <div className={styles.modalContent}>
              <label>Выберите организацию</label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                <option value="">-- Выберите --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowGrantModal(false)}
              >
                Отмена
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleGrant}
                disabled={!selectedOrg}
              >
                <span className="material-icons">check</span>
                Выдать доступ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
