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
  created_at: string;
};

type RolesManagerProps = {
  roles: RoleRecord[];
};

const AVAILABLE_PERMISSIONS = [
  { id: "dashboard:view", label: "Просмотр дашборда", category: "Дашборд" },
  { id: "dashboard:edit", label: "Редактирование дашборда", category: "Дашборд" },
  { id: "transactions:view", label: "Просмотр транзакций", category: "Транзакции" },
  { id: "transactions:create", label: "Создание транзакций", category: "Транзакции" },
  { id: "transactions:edit", label: "Редактирование транзакций", category: "Транзакции" },
  { id: "transactions:delete", label: "Удаление транзакций", category: "Транзакции" },
  { id: "budgets:view", label: "Просмотр бюджетов", category: "Бюджеты" },
  { id: "budgets:create", label: "Создание бюджетов", category: "Бюджеты" },
  { id: "budgets:edit", label: "Редактирование бюджетов", category: "Бюджеты" },
  { id: "budgets:delete", label: "Удаление бюджетов", category: "Бюджеты" },
  { id: "reports:view", label: "Просмотр отчётов", category: "Отчёты" },
  { id: "reports:create", label: "Создание отчётов", category: "Отчёты" },
  { id: "reports:export", label: "Экспорт отчётов", category: "Отчёты" },
  { id: "settings:view", label: "Просмотр настроек", category: "Настройки" },
  { id: "settings:edit", label: "Изменение настроек", category: "Настройки" },
  { id: "users:view", label: "Просмотр пользователей", category: "Пользователи" },
  { id: "users:invite", label: "Приглашение пользователей", category: "Пользователи" },
  { id: "users:edit", label: "Редактирование пользователей", category: "Пользователи" },
  { id: "users:delete", label: "Удаление пользователей", category: "Пользователи" },
  { id: "roles:view", label: "Просмотр ролей", category: "Роли" },
  { id: "roles:create", label: "Создание ролей", category: "Роли" },
  { id: "roles:edit", label: "Редактирование ролей", category: "Роли" },
  { id: "roles:delete", label: "Удаление ролей", category: "Роли" },
  { id: "roles:assign", label: "Назначение ролей", category: "Роли" },
];

const ROLE_COLORS = [
  "#667eea", "#764ba2", "#f093fb", "#4facfe", 
  "#43e97b", "#fa709a", "#fee140", "#30cfd0",
  "#a8edea", "#ff6b6b", "#4ecdc4", "#95e1d3"
];

export default function RolesManager({ roles: initialRoles }: RolesManagerProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRecord[]>(initialRoles);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    color: ROLE_COLORS[0],
    is_default: false,
  });

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: [],
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      is_default: false,
    });
    setShowModal(true);
  };

  const handleEdit = (role: RoleRecord) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      color: role.color,
      is_default: role.is_default,
    });
    setShowModal(true);
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
        body: JSON.stringify(formData),
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
  const allPermissionsSelected = formData.permissions.length === AVAILABLE_PERMISSIONS.length;

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
        {roles.map(role => (
          <div key={role.id} className={styles.roleCard}>
            <div className={styles.roleHeader}>
              <div className={styles.roleInfo}>
                <div 
                  className={styles.roleColor} 
                  style={{ backgroundColor: role.color }}
                />
                <div>
                  <div className={styles.roleName}>
                    {role.name}
                    {role.is_default && (
                      <span className={styles.defaultBadge}>Системная</span>
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
                {!role.is_default && (
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
        ))}

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
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingRole ? "Редактировать роль" : "Создать роль"}</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
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
                      Выбрано: {formData.permissions.length} / {AVAILABLE_PERMISSIONS.length}
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
      )}
    </div>
  );
}
