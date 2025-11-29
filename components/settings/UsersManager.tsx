"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./UsersManager.module.css";

export type UserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  role_id: string | null;
  role_name: string | null;
  role_color: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin?: boolean;
};

export type RoleOption = {
  id: string;
  name: string;
  color: string;
};

type UsersManagerProps = {
  users: UserRecord[];
  roles: RoleOption[];
};

export default function UsersManager({ users: initialUsers, roles }: UsersManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role_id: "",
  });

  const [editForm, setEditForm] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const [assignForm, setAssignForm] = useState({
    role_id: "",
  });

  // Состояние для показа/скрытия пароля
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const handleCreateUser = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      alert("Email и пароль обязательны");
      return;
    }

    if (createForm.password.length < 6) {
      alert("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      const data = await res.json();
      setUsers([...users, data.user]);
      setShowCreateModal(false);
      setCreateForm({ email: "", password: "", full_name: "", role_id: "" });
      router.refresh();
      alert("Пользователь успешно создан! Учётные данные:\nEmail: " + createForm.email + "\nПароль: " + createForm.password);
    } catch (error) {
      console.error("Create user error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при создании пользователя");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    if (!editForm.email.trim()) {
      alert("Email обязателен");
      return;
    }

    if (editForm.password && editForm.password.length < 6) {
      alert("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editForm.email.trim(),
          password: editForm.password || undefined,
          full_name: editForm.full_name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }

      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, email: editForm.email.trim(), full_name: editForm.full_name || null }
          : u
      ));
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({ email: "", password: "", full_name: "" });
      router.refresh();
      alert("Пользователь успешно обновлён");
    } catch (error) {
      console.error("Edit user error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при обновлении пользователя");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assignForm.role_id) {
      alert("Выберите роль");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: assignForm.role_id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign role");
      }

      const selectedRole = roles.find(r => r.id === assignForm.role_id);
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, role_id: assignForm.role_id, role_name: selectedRole?.name || null, role_color: selectedRole?.color || null }
          : u
      ));
      setShowAssignModal(false);
      setSelectedUser(null);
      setAssignForm({ role_id: "" });
      router.refresh();
    } catch (error) {
      console.error("Assign role error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при назначении роли");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserRecord) => {
    if (user.is_admin) {
      alert("Невозможно удалить администратора системы");
      return;
    }

    if (!confirm(`Удалить пользователя ${user.email}?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }

      setUsers(users.filter(u => u.id !== user.id));
      router.refresh();
    } catch (error) {
      console.error("Delete user error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при удалении пользователя");
    }
  };

  const openEditModal = (user: UserRecord) => {
    setSelectedUser(user);
    setEditForm({ 
      email: user.email, 
      password: "",
      full_name: user.full_name || "" 
    });
    setShowEditModal(true);
  };

  const openAssignModal = (user: UserRecord) => {
    setSelectedUser(user);
    setAssignForm({ role_id: user.role_id || "" });
    setShowAssignModal(true);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name[0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Управление пользователями</h2>
          <p className={styles.subtitle}>
            Создавайте пользователей и назначайте им роли
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setShowCreateModal(true)}>
          <span className="material-icons">person_add</span>
          Создать пользователя
        </button>
      </div>

      <div className={styles.usersTable}>
        <table>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Создан</th>
              <th>Последний вход</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className={styles.userCell}>
                    <div className={styles.userAvatar}>
                      {getInitials(user.full_name, user.email)}
                    </div>
                    <div>
                      <div className={styles.userName}>
                        {user.full_name || "Не указано"}
                        {user.is_admin && (
                          <span className={styles.adminBadge}>
                            <span className="material-icons">verified</span>
                            Администратор
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  {user.role_name ? (
                    <span 
                      className={styles.roleBadge}
                      style={{ backgroundColor: user.role_color || "#667eea" }}
                    >
                      {user.role_name}
                    </span>
                  ) : user.is_admin ? (
                    <span className={styles.roleBadge} style={{ backgroundColor: "#fbbf24" }}>
                      Полный доступ
                    </span>
                  ) : (
                    <span className={styles.noRole}>Без роли</span>
                  )}
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td>{formatDate(user.last_sign_in_at)}</td>
                <td>
                  <div className={styles.actions}>
                    {!user.is_admin && (
                      <>
                        <button
                          className={styles.btnIcon}
                          onClick={() => openEditModal(user)}
                          title="Редактировать"
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button
                          className={styles.btnIcon}
                          onClick={() => openAssignModal(user)}
                          title="Назначить роль"
                        >
                          <span className="material-icons">badge</span>
                        </button>
                        <button
                          className={styles.btnIconDanger}
                          onClick={() => handleDeleteUser(user)}
                          title="Удалить"
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </>
                    )}
                    {user.is_admin && (
                      <span className={styles.adminProtected}>
                        <span className="material-icons">lock</span>
                        Защищён
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className={styles.emptyState}>
            <span className="material-icons">people</span>
            <p>Нет созданных пользователей</p>
          </div>
        )}
      </div>

      {/* Модальное окно создания пользователя */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Создать пользователя</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowCreateModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email *</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Пароль *</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    className={styles.formInput}
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Минимум 6 символов"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    title={showCreatePassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    <span className="material-icons">
                      {showCreatePassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Полное имя</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={createForm.full_name}
                  onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="Иван Иванов"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Роль</label>
                <select
                  className={styles.formSelect}
                  value={createForm.role_id}
                  onChange={e => setCreateForm({ ...createForm, role_id: e.target.value })}
                >
                  <option value="">Без роли</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowCreateModal(false)}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleCreateUser}
                disabled={isSaving}
              >
                {isSaving ? "Создание..." : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования пользователя */}
      {showEditModal && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Редактировать пользователя</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email *</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Новый пароль (оставьте пустым, чтобы не менять)</label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showEditPassword ? "text" : "password"}
                    className={styles.formInput}
                    value={editForm.password}
                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Минимум 6 символов"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    title={showEditPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    <span className="material-icons">
                      {showEditPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Полное имя</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={editForm.full_name}
                  onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Иван Иванов"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowEditModal(false)}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleEditUser}
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно назначения роли */}
      {showAssignModal && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Назначить роль</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowAssignModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                Пользователь: <strong>{selectedUser.email}</strong>
              </p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Выберите роль</label>
                <select
                  className={styles.formSelect}
                  value={assignForm.role_id}
                  onChange={e => setAssignForm({ role_id: e.target.value })}
                >
                  <option value="">Без роли</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowAssignModal(false)}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleAssignRole}
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Назначить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
