"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Platform, PlatformInput, PlatformFilters } from "@/types/platform";
import { createPlatform, updatePlatform, deletePlatform, togglePlatformActive, getPlatformTenders } from "@/lib/dictionaries/platforms-service";
import styles from "./PlatformsPage.module.css";

interface PlatformsPageProps {
  initialPlatforms: Platform[];
  stats: {
    total: number;
    active: number;
  };
  tendersStats: Record<string, number>;
}

interface PlatformTender {
  id: string;
  purchase_number: string;
  subject: string;
  nmck: number;
  status: string;
  customer: string;
}

export default function PlatformsPage({ initialPlatforms, stats, tendersStats }: PlatformsPageProps) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [filters, setFilters] = useState<PlatformFilters>({
    search: "",
    is_active: "all",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingPlatform, setViewingPlatform] = useState<Platform | null>(null);
  const [platformTenders, setPlatformTenders] = useState<PlatformTender[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Фильтрация
  const filteredPlatforms = platforms.filter((p) => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(search);
      const matchShortName = p.short_name?.toLowerCase().includes(search);
      const matchUrl = p.url?.toLowerCase().includes(search);
      if (!matchName && !matchShortName && !matchUrl) return false;
    }
    if (filters.is_active !== "all" && p.is_active !== filters.is_active) return false;
    return true;
  });

  // Открыть модалку для создания
  const handleCreate = () => {
    setEditingPlatform(null);
    setIsModalOpen(true);
  };

  // Открыть модалку для редактирования
  const handleEdit = (platform: Platform) => {
    setEditingPlatform(platform);
    setIsModalOpen(true);
  };

  // Сохранить площадку
  const handleSave = async (input: PlatformInput) => {
    setIsLoading(true);
    try {
      if (editingPlatform) {
        const result = await updatePlatform(editingPlatform.id, input);
        if (result.success && result.data) {
          setPlatforms((prev) =>
            prev.map((p) => (p.id === editingPlatform.id ? result.data! : p))
          );
        }
      } else {
        const result = await createPlatform(input);
        if (result.success && result.data) {
          setPlatforms((prev) => [...prev, result.data!]);
        }
      }
      setIsModalOpen(false);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // Удалить площадку
  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить площадку?")) return;
    
    setIsLoading(true);
    try {
      const result = await deletePlatform(id);
      if (result.success) {
        setPlatforms((prev) => prev.filter((p) => p.id !== id));
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Переключить активность
  const handleToggleActive = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await togglePlatformActive(id);
      if (result.success) {
        setPlatforms((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
        );
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Просмотр тендеров площадки
  const handleViewDetails = async (platform: Platform) => {
    setViewingPlatform(platform);
    setIsDetailsLoading(true);
    try {
      const tenders = await getPlatformTenders(platform.id);
      setPlatformTenders(tenders);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Закрыть детали
  const handleCloseDetails = () => {
    setViewingPlatform(null);
    setPlatformTenders([]);
  };

  // Форматирование суммы
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className="material-icons">storefront</span>
            Площадки
          </h1>
          <p className={styles.subtitle}>Справочник торговых площадок</p>
        </div>
        <button className={styles.addButton} onClick={handleCreate}>
          <span className="material-icons">add</span>
          Добавить площадку
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Всего площадок</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.active}</span>
          <span className={styles.statLabel}>Активных</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{stats.total - stats.active}</span>
          <span className={styles.statLabel}>Неактивных</span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Поиск по названию или URL..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={styles.searchInput}
          />
        </div>
        <select
          value={filters.is_active === "all" ? "all" : filters.is_active ? "active" : "inactive"}
          onChange={(e) =>
            setFilters({
              ...filters,
              is_active: e.target.value === "all" ? "all" : e.target.value === "active",
            })
          }
          className={styles.filterSelect}
        >
          <option value="all">Все</option>
          <option value="active">Активные</option>
          <option value="inactive">Неактивные</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Сокращение</th>
              <th>URL</th>
              <th>Тендеры</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlatforms.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  {platforms.length === 0
                    ? "Площадки не найдены. Добавьте первую площадку."
                    : "Нет площадок, соответствующих фильтрам"}
                </td>
              </tr>
            ) : (
              filteredPlatforms.map((platform) => (
                <tr key={platform.id} className={!platform.is_active ? styles.inactiveRow : ""}>
                  <td>
                    <div className={styles.nameCell}>
                      <span className={styles.platformName}>{platform.name}</span>
                    </div>
                  </td>
                  <td>{platform.short_name || "—"}</td>
                  <td>
                    {platform.url ? (
                      <a
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                      >
                        {platform.url}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span 
                      className={styles.tendersCount}
                      onClick={() => handleViewDetails(platform)}
                      style={{ cursor: 'pointer' }}
                    >
                      {tendersStats[platform.id] || 0}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.status} ${
                        platform.is_active ? styles.statusActive : styles.statusInactive
                      }`}
                    >
                      {platform.is_active ? "Активна" : "Неактивна"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleViewDetails(platform)}
                        title="Тендеры"
                      >
                        <span className="material-icons">visibility</span>
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEdit(platform)}
                        title="Редактировать"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleToggleActive(platform.id)}
                        title={platform.is_active ? "Деактивировать" : "Активировать"}
                      >
                        <span className="material-icons">
                          {platform.is_active ? "toggle_on" : "toggle_off"}
                        </span>
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(platform.id)}
                        title="Удалить"
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for create/edit */}
      {isModalOpen && (
        <PlatformModal
          platform={editingPlatform}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          isLoading={isLoading}
        />
      )}

      {/* Details panel */}
      {viewingPlatform && (
        <div className={styles.detailsOverlay} onClick={handleCloseDetails}>
          <div className={styles.detailsPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <h2>
                <span className="material-icons">storefront</span>
                {viewingPlatform.name}
              </h2>
              <button className={styles.closeButton} onClick={handleCloseDetails}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className={styles.detailsContent}>
              {/* Platform info */}
              <div className={styles.detailsSection}>
                <h3>Информация о площадке</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Сокращённое название</span>
                    <span className={styles.infoValue}>
                      {viewingPlatform.short_name || "—"}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>URL</span>
                    <span className={styles.infoValue}>
                      {viewingPlatform.url ? (
                        <a href={viewingPlatform.url} target="_blank" rel="noopener noreferrer">
                          {viewingPlatform.url}
                        </a>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Описание</span>
                    <span className={styles.infoValue}>
                      {viewingPlatform.description || "—"}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Статус</span>
                    <span className={styles.infoValue}>
                      {viewingPlatform.is_active ? "Активна" : "Неактивна"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tenders */}
              <div className={styles.detailsSection}>
                <h3>
                  <span className="material-icons">description</span>
                  Тендеры на площадке ({platformTenders.length})
                </h3>
                {isDetailsLoading ? (
                  <div className={styles.loading}>Загрузка...</div>
                ) : platformTenders.length === 0 ? (
                  <div className={styles.emptyState}>Нет тендеров на этой площадке</div>
                ) : (
                  <div className={styles.tendersList}>
                    {platformTenders.map((tender) => (
                      <div key={tender.id} className={styles.tenderCard}>
                        <div className={styles.tenderHeader}>
                          <span className={styles.tenderNumber}>
                            № {tender.purchase_number}
                          </span>
                          <span className={styles.tenderStatus}>{tender.status}</span>
                        </div>
                        <div className={styles.tenderSubject}>{tender.subject}</div>
                        <div className={styles.tenderFooter}>
                          <span className={styles.tenderCustomer}>
                            <span className="material-icons">business</span>
                            {tender.customer || "—"}
                          </span>
                          <span className={styles.tenderNmck}>
                            {formatMoney(tender.nmck)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal component
interface PlatformModalProps {
  platform: Platform | null;
  onSave: (input: PlatformInput) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function PlatformModal({ platform, onSave, onClose, isLoading }: PlatformModalProps) {
  const [formData, setFormData] = useState<PlatformInput>({
    name: platform?.name || "",
    short_name: platform?.short_name || "",
    url: platform?.url || "",
    description: platform?.description || "",
    is_active: platform?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    await onSave(formData);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{platform ? "Редактировать площадку" : "Добавить площадку"}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Название *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: ЕИС, Сбербанк-АСТ"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Сокращённое название</label>
            <input
              type="text"
              value={formData.short_name || ""}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              placeholder="Например: ЕИС"
            />
          </div>

          <div className={styles.formGroup}>
            <label>URL</label>
            <input
              type="url"
              value={formData.url || ""}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://zakupki.gov.ru"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Описание</label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание площадки..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Активна
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Отмена
            </button>
            <button type="submit" className={styles.saveButton} disabled={isLoading}>
              {isLoading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
