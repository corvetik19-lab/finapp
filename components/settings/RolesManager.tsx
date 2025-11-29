"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./RolesManager.module.css";

export type RoleRecord = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  is_default: boolean;
  is_system?: boolean;
  allowed_modes?: string[] | null;
  created_at: string;
};

type RolesManagerProps = {
  roles: RoleRecord[];
  companyId?: string | null;
};

// Только права связанные с тендерами (роли только для режима тендеров)
const AVAILABLE_PERMISSIONS = [
  // --- Тендеры: Общие ---
  { id: "tenders:view", label: "Доступ к модулю", category: "Тендеры: Общие" },
  { id: "tenders:view_all", label: "Просмотр всех тендеров", category: "Тендеры: Общие" },
  { id: "tenders:view_own", label: "Просмотр только своих тендеров", category: "Тендеры: Общие" },
  { id: "tenders:create", label: "Создание тендеров", category: "Тендеры: Общие" },
  { id: "tenders:edit", label: "Редактирование тендеров", category: "Тендеры: Общие" },
  { id: "tenders:edit_own", label: "Редактирование только своих", category: "Тендеры: Общие" },
  { id: "tenders:delete", label: "Удаление тендеров", category: "Тендеры: Общие" },
  { id: "tenders:import", label: "Импорт тендеров из ЕИС", category: "Тендеры: Общие" },
  { id: "tenders:export", label: "Экспорт тендеров", category: "Тендеры: Общие" },

  // --- Тендеры: Канбан и этапы ---
  { id: "tenders:stages", label: "Управление этапами (Канбан)", category: "Тендеры: Этапы" },
  { id: "tenders:stages:move_forward", label: "Перемещение вперёд по этапам", category: "Тендеры: Этапы" },
  { id: "tenders:stages:move_backward", label: "Перемещение назад по этапам", category: "Тендеры: Этапы" },
  { id: "tenders:stages:archive", label: "Архивирование тендеров", category: "Тендеры: Этапы" },
  { id: "tenders:stages:restore", label: "Восстановление из архива", category: "Тендеры: Этапы" },

  // --- Тендеры: Просчёт ---
  { id: "tenders:calc:view", label: "Просмотр просчётов", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:create", label: "Создание просчётов", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:edit", label: "Редактирование просчётов", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:approve", label: "Утверждение просчётов", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:set_price", label: "Установка цены предложения", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:view_margin", label: "Просмотр маржинальности", category: "Тендеры: Просчёт" },

  // --- Тендеры: Документы ---
  { id: "tenders:docs:view", label: "Просмотр документов", category: "Тендеры: Документы" },
  { id: "tenders:docs:upload", label: "Загрузка документов", category: "Тендеры: Документы" },
  { id: "tenders:docs:delete", label: "Удаление документов", category: "Тендеры: Документы" },
  { id: "tenders:docs:download", label: "Скачивание документов", category: "Тендеры: Документы" },
  { id: "tenders:docs:sign", label: "Подписание документов", category: "Тендеры: Документы" },

  // --- Тендеры: Проверка ---
  { id: "tenders:review:view", label: "Просмотр на проверке", category: "Тендеры: Проверка" },
  { id: "tenders:review:approve", label: "Одобрение заявки", category: "Тендеры: Проверка" },
  { id: "tenders:review:reject", label: "Отклонение заявки", category: "Тендеры: Проверка" },
  { id: "tenders:review:comment", label: "Комментирование заявки", category: "Тендеры: Проверка" },
  { id: "tenders:review:return", label: "Возврат на доработку", category: "Тендеры: Проверка" },

  // --- Тендеры: Торги ---
  { id: "tenders:auction:view", label: "Просмотр торгов", category: "Тендеры: Торги" },
  { id: "tenders:auction:participate", label: "Участие в торгах", category: "Тендеры: Торги" },
  { id: "tenders:auction:set_result", label: "Установка результатов", category: "Тендеры: Торги" },

  // --- Тендеры: Контракт ---
  { id: "tenders:contract:view", label: "Просмотр контрактов", category: "Тендеры: Контракт" },
  { id: "tenders:contract:create", label: "Создание контракта", category: "Тендеры: Контракт" },
  { id: "tenders:contract:edit", label: "Редактирование контракта", category: "Тендеры: Контракт" },
  { id: "tenders:contract:sign", label: "Подписание контракта", category: "Тендеры: Контракт" },
  { id: "tenders:contract:close", label: "Закрытие контракта", category: "Тендеры: Контракт" },

  // --- Тендеры: Назначения ---
  { id: "tenders:assign:manager", label: "Назначение менеджера", category: "Тендеры: Назначения" },
  { id: "tenders:assign:specialist", label: "Назначение специалиста", category: "Тендеры: Назначения" },
  { id: "tenders:assign:calculator", label: "Назначение просчётчика", category: "Тендеры: Назначения" },
  { id: "tenders:assign:reviewer", label: "Назначение проверяющего", category: "Тендеры: Назначения" },
  { id: "tenders:assign:executor", label: "Назначение исполнителя", category: "Тендеры: Назначения" },

  // --- Тендеры: Аналитика ---
  { id: "tenders:analytics:view", label: "Просмотр аналитики", category: "Тендеры: Аналитика" },
  { id: "tenders:analytics:reports", label: "Формирование отчётов", category: "Тендеры: Аналитика" },
  { id: "tenders:analytics:kpi", label: "Просмотр KPI сотрудников", category: "Тендеры: Аналитика" },
  { id: "tenders:analytics:finance", label: "Финансовая аналитика", category: "Тендеры: Аналитика" },
];

const ROLE_COLORS = [
  "#667eea", "#764ba2", "#f093fb", "#4facfe", 
  "#43e97b", "#fa709a", "#fee140", "#30cfd0",
  "#a8edea", "#ff6b6b", "#4ecdc4", "#95e1d3"
];

// Предустановленные шаблоны ролей для тендерного отдела
const ROLE_PRESETS = [
  {
    name: "Администратор тендеров",
    description: "Полный доступ ко всем функциям тендерного модуля",
    permissions: [
      "tenders:view", "tenders:view_all", "tenders:create", "tenders:edit", "tenders:delete",
      "tenders:import", "tenders:export",
      "tenders:stages", "tenders:stages:move_forward", "tenders:stages:move_backward", 
      "tenders:stages:archive", "tenders:stages:restore",
      "tenders:calc:view", "tenders:calc:create", "tenders:calc:edit", "tenders:calc:approve",
      "tenders:calc:set_price", "tenders:calc:view_margin",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:delete", "tenders:docs:download", "tenders:docs:sign",
      "tenders:review:view", "tenders:review:approve", "tenders:review:reject", "tenders:review:comment", "tenders:review:return",
      "tenders:auction:view", "tenders:auction:participate", "tenders:auction:set_result",
      "tenders:contract:view", "tenders:contract:create", "tenders:contract:edit", "tenders:contract:sign", "tenders:contract:close",
      "tenders:assign:manager", "tenders:assign:specialist", "tenders:assign:calculator", "tenders:assign:reviewer", "tenders:assign:executor",
      "tenders:analytics:view", "tenders:analytics:reports", "tenders:analytics:kpi", "tenders:analytics:finance"
    ],
    color: "#667eea"
  },
  {
    name: "Менеджер тендеров",
    description: "Управление тендерами, назначение исполнителей, контроль этапов",
    permissions: [
      "tenders:view", "tenders:view_all", "tenders:create", "tenders:edit",
      "tenders:import", "tenders:export",
      "tenders:stages", "tenders:stages:move_forward", "tenders:stages:archive",
      "tenders:calc:view", "tenders:calc:approve", "tenders:calc:view_margin",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:download",
      "tenders:review:view", "tenders:review:comment",
      "tenders:auction:view", "tenders:auction:set_result",
      "tenders:contract:view", "tenders:contract:create", "tenders:contract:edit",
      "tenders:assign:specialist", "tenders:assign:calculator", "tenders:assign:executor",
      "tenders:analytics:view", "tenders:analytics:reports"
    ],
    color: "#3b82f6"
  },
  {
    name: "Просчётчик",
    description: "Расчёт стоимости, подготовка коммерческих предложений",
    permissions: [
      "tenders:view", "tenders:view_own",
      "tenders:stages:move_forward",
      "tenders:calc:view", "tenders:calc:create", "tenders:calc:edit", "tenders:calc:set_price",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:download"
    ],
    color: "#8b5cf6"
  },
  {
    name: "Отдел проверки",
    description: "Проверка и согласование заявок перед подачей",
    permissions: [
      "tenders:view", "tenders:view_all",
      "tenders:stages:move_forward", "tenders:stages:move_backward",
      "tenders:calc:view", "tenders:calc:view_margin",
      "tenders:docs:view", "tenders:docs:download",
      "tenders:review:view", "tenders:review:approve", "tenders:review:reject", 
      "tenders:review:comment", "tenders:review:return"
    ],
    color: "#f59e0b"
  },
  {
    name: "Специалист по торгам",
    description: "Участие в аукционах и электронных торгах",
    permissions: [
      "tenders:view", "tenders:view_own",
      "tenders:stages:move_forward",
      "tenders:calc:view",
      "tenders:docs:view", "tenders:docs:download",
      "tenders:auction:view", "tenders:auction:participate", "tenders:auction:set_result"
    ],
    color: "#10b981"
  },
  {
    name: "Контрактный менеджер",
    description: "Работа с контрактами и договорами",
    permissions: [
      "tenders:view", "tenders:view_all",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:download", "tenders:docs:sign",
      "tenders:contract:view", "tenders:contract:create", "tenders:contract:edit", 
      "tenders:contract:sign", "tenders:contract:close"
    ],
    color: "#ec4899"
  },
  {
    name: "Наблюдатель тендеров",
    description: "Только просмотр тендеров и аналитики",
    permissions: [
      "tenders:view", "tenders:view_all",
      "tenders:calc:view",
      "tenders:docs:view", "tenders:docs:download",
      "tenders:review:view",
      "tenders:auction:view",
      "tenders:contract:view",
      "tenders:analytics:view"
    ],
    color: "#64748b"
  }
];

export default function RolesManager({ roles: initialRoles, companyId }: RolesManagerProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRecord[]>(initialRoles);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    color: ROLE_COLORS[0],
    is_default: false,
    allowed_modes: null as string[] | null,
  });

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: [],
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      is_default: false,
      allowed_modes: null,
    });
    setShowModal(true);
  };

  const handleEdit = (role: RoleRecord) => {
    setEditingRole(role);
    // Фильтруем только те разрешения, которые есть в списке AVAILABLE_PERMISSIONS
    const availableIds = AVAILABLE_PERMISSIONS.map(p => p.id);
    const filteredPermissions = role.permissions.filter(p => availableIds.includes(p));
    setFormData({
      name: role.name,
      description: role.description,
      permissions: filteredPermissions,
      color: role.color,
      is_default: role.is_default,
      allowed_modes: role.allowed_modes || null,
    });
    setShowModal(true);
  };

  // Получить исходные права для системной роли
  const getDefaultPermissionsForSystemRole = (roleName: string): string[] | null => {
    const preset = ROLE_PRESETS.find(p => p.name === roleName);
    if (preset) return preset.permissions;
    
    // Для роли "Админ организации (Тендеры)" - все права тендеров
    if (roleName === "Админ организации (Тендеры)") {
      return AVAILABLE_PERMISSIONS.map(p => p.id);
    }
    
    return null;
  };

  const handleResetToDefault = () => {
    if (!editingRole) return;
    
    const defaultPermissions = getDefaultPermissionsForSystemRole(editingRole.name);
    if (defaultPermissions) {
      setFormData(prev => ({
        ...prev,
        permissions: defaultPermissions
      }));
    } else {
      alert("Не удалось найти исходные права для этой роли");
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Введите название роли");
      return;
    }

    if (formData.permissions.length === 0) {
      alert("Выберите хотя бы одно разрешение");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles";
      const method = editingRole ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          company_id: companyId, // Передаём company_id для привязки роли к компании
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save role");
      }

      const data = await res.json();
      
      if (editingRole) {
        setRoles(roles.map(r => r.id === editingRole.id ? data.role : r));
      } else {
        setRoles([...roles, data.role]);
      }

      setShowModal(false);
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при сохранении роли");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (role: RoleRecord) => {
    if (role.is_default) {
      alert("Нельзя удалить системную роль");
      return;
    }

    if (!confirm(`Удалить роль "${role.name}"?`)) return;

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete role");
      }

      setRoles(roles.filter(r => r.id !== role.id));
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при удалении роли");
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
    }));
  };

  const deselectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const selectCategoryPermissions = (category: string) => {
    const categoryPerms = AVAILABLE_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const allSelected = categoryPerms.every(p => formData.permissions.includes(p));
    
    if (allSelected) {
      // Снять все разрешения категории
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPerms.includes(p))
      }));
    } else {
      // Выбрать все разрешения категории
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPerms])]
      }));
    }
  };

  const groupPermissionsByCategory = () => {
    const grouped: Record<string, typeof AVAILABLE_PERMISSIONS> = {};
    AVAILABLE_PERMISSIONS.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  const permissionsByCategory = groupPermissionsByCategory();
  const availablePermissionIds = AVAILABLE_PERMISSIONS.map(p => p.id);
  const selectedAvailableCount = formData.permissions.filter(p => availablePermissionIds.includes(p)).length;
  const allPermissionsSelected = selectedAvailableCount === AVAILABLE_PERMISSIONS.length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Управление ролями</h2>
          <p className={styles.subtitle}>
            Создавайте роли и настраивайте права доступа для пользователей
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={handleCreate}>
          <span className="material-icons">add</span>
          Создать роль
        </button>
      </div>

      <div className={styles.rolesList}>
        {roles.map(role => {
          const isSystemRole = role.is_system || role.is_default;
          return (
          <div key={role.id} className={`${styles.roleCard} ${isSystemRole ? styles.systemRoleCard : ''}`}>
            <div className={styles.roleHeader}>
              <div className={styles.roleInfo}>
                <div 
                  className={styles.roleColor} 
                  style={{ backgroundColor: role.color }}
                />
                <div>
                  <div className={styles.roleName}>
                    {role.name}
                    {isSystemRole && (
                      <span className={styles.defaultBadge}>
                        <span className="material-icons" style={{ fontSize: 12 }}>lock</span>
                        Системная
                      </span>
                    )}
                  </div>
                  <div className={styles.roleDescription}>{role.description}</div>
                </div>
              </div>
              <div className={styles.roleActions}>
                <button
                  className={styles.btnIcon}
                  onClick={() => handleEdit(role)}
                  title="Редактировать"
                >
                  <span className="material-icons">edit</span>
                </button>
                {!isSystemRole && (
                  <button
                    className={styles.btnIconDanger}
                    onClick={() => handleDelete(role)}
                    title="Удалить"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className={styles.rolePermissions}>
              <div className={styles.permissionsLabel}>
                Разрешений: {role.permissions.length}
              </div>
              <div className={styles.permissionsTags}>
                {role.permissions.slice(0, 5).map(perm => {
                  const permission = AVAILABLE_PERMISSIONS.find(p => p.id === perm);
                  return permission ? (
                    <span key={perm} className={styles.permissionTag}>
                      {permission.label}
                    </span>
                  ) : null;
                })}
                {role.permissions.length > 5 && (
                  <span className={styles.permissionTag}>
                    +{role.permissions.length - 5}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
        })}

        {roles.length === 0 && (
          <div className={styles.emptyState}>
            <span className="material-icons">admin_panel_settings</span>
            <p>Нет созданных ролей</p>
            <button className={styles.btnSecondary} onClick={handleCreate}>
              Создать первую роль
            </button>
          </div>
        )}
      </div>

      {/* Модальное окно */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div 
            className={`${styles.modal} ${isFullscreen ? styles.modalFullscreen : ''}`} 
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>{editingRole ? "Редактировать роль" : "Создать роль"}</h3>
              <div className={styles.modalHeaderActions}>
                <button
                  className={styles.fullscreenBtn}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Свернуть" : "Развернуть на весь экран"}
                >
                  <span className="material-icons">
                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  </span>
                </button>
                <button
                  className={styles.closeBtn}
                  onClick={() => setShowModal(false)}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              {/* Шаблоны ролей - только при создании */}
              {!editingRole && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <span className="material-icons" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6 }}>auto_awesome</span>
                    Быстрый выбор из шаблонов
                  </label>
                  <div className={styles.presetsGrid}>
                    {ROLE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={styles.presetCard}
                        onClick={() => setFormData({
                          name: preset.name,
                          description: preset.description,
                          permissions: preset.permissions,
                          color: preset.color,
                          is_default: false,
                          allowed_modes: null
                        })}
                      >
                        <div 
                          className={styles.presetColor}
                          style={{ backgroundColor: preset.color }}
                        />
                        <div className={styles.presetInfo}>
                          <div className={styles.presetName}>{preset.name}</div>
                          <div className={styles.presetDesc}>{preset.description}</div>
                          <div className={styles.presetCount}>
                            {preset.permissions.length} разрешений
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название роли *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Менеджер, Бухгалтер"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea
                  className={styles.formTextarea}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание роли и её назначения"
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Цвет</label>
                <div className={styles.colorPicker}>
                  {ROLE_COLORS.map(color => (
                    <button
                      key={color}
                      className={`${styles.colorOption} ${formData.color === color ? styles.colorSelected : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              {/* Режим тендеров включён по умолчанию для всех ролей */}
              <div className={styles.modeInfo}>
                <span className="material-icons">gavel</span>
                <span>Все роли относятся к режиму <strong>Тендеры</strong></span>
              </div>

              <div className={styles.formGroup}>
                <div className={styles.permissionsHeader}>
                  <label className={styles.formLabel}>Разрешения *</label>
                  <div className={styles.permissionsActions}>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={allPermissionsSelected ? deselectAllPermissions : selectAllPermissions}
                    >
                      <span className="material-icons">
                        {allPermissionsSelected ? "clear_all" : "select_all"}
                      </span>
                      {allPermissionsSelected ? "Снять все" : "Выбрать все"}
                    </button>
                    <span className={styles.permissionsCount}>
                      Выбрано: {selectedAvailableCount} / {AVAILABLE_PERMISSIONS.length}
                    </span>
                  </div>
                </div>
                <div className={styles.permissionsGrid}>
                  {Object.entries(permissionsByCategory).map(([category, perms]) => {
                    const categoryPerms = perms.map(p => p.id);
                    const allCategorySelected = categoryPerms.every(p => formData.permissions.includes(p));
                    
                    return (
                      <div key={category} className={styles.permissionCategory}>
                        <div className={styles.categoryHeader}>
                          <div className={styles.categoryTitle}>{category}</div>
                          <button
                            type="button"
                            className={styles.btnCategoryToggle}
                            onClick={() => selectCategoryPermissions(category)}
                            title={allCategorySelected ? "Снять все" : "Выбрать все"}
                          >
                            <span className="material-icons">
                              {allCategorySelected ? "check_box" : "check_box_outline_blank"}
                            </span>
                          </button>
                        </div>
                        {perms.map(perm => (
                          <label key={perm.id} className={styles.permissionCheckbox}>
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                            />
                            <span>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalFooterLeft}>
                {/* Кнопка сброса для системных ролей */}
                {editingRole && (editingRole.is_system || editingRole.is_default) && (
                  <button
                    type="button"
                    className={styles.btnReset}
                    onClick={handleResetToDefault}
                    disabled={isSaving}
                    title="Вернуть исходные права системной роли"
                  >
                    <span className="material-icons">restart_alt</span>
                    Сбросить права
                  </button>
                )}
              </div>
              <div className={styles.modalFooterRight}>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                >
                  Отмена
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Сохранение..." : editingRole ? "Сохранить" : "Создать"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
