"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./ProfileManager.module.css";

type ProfileData = {
  email: string;
  fullName: string;
  phone: string;
  avatar: string | null;
  createdAt: string;
};

type ProfileManagerProps = {
  profile: ProfileData;
};

export default function ProfileManager({ profile: initialProfile }: ProfileManagerProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: initialProfile.fullName || "",
    phone: initialProfile.phone || "",
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    if (!confirm("Вы уверены что хотите выйти?")) return;

    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Sign out error:", error);
      alert("Ошибка при выходе");
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      setProfile({ ...profile, ...editForm });
      setIsEditing(false);
      alert("Профиль обновлён!");
      router.refresh();
    } catch (error) {
      console.error("Update error:", error);
      alert("Ошибка при обновлении профиля");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Пароли не совпадают");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change password");
      }

      alert("Пароль успешно изменён!");
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Password change error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при смене пароля");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 2MB");
      return;
    }

    // Проверка типа
    if (!file.type.startsWith("image/")) {
      alert("Можно загружать только изображения");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload avatar");

      const data = await res.json();
      setProfile({ ...profile, avatar: data.avatarUrl });
      router.refresh();
    } catch (error) {
      console.error("Avatar upload error:", error);
      alert("Ошибка при загрузке аватара");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className={styles.container}>
      {/* Шапка профиля */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Мой профиль</h1>
          <button className={styles.signOutBtn} onClick={handleSignOut}>
            <span className="material-icons">logout</span>
            Выйти
          </button>
        </div>
      </div>

      {/* Карточка профиля */}
      <div className={styles.profileCard}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            {profile.avatar ? (
              <Image 
                src={profile.avatar} 
                alt="Avatar" 
                className={styles.avatar} 
                width={120} 
                height={120}
                unoptimized={profile.avatar.startsWith('data:')}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {getInitials(profile.fullName || profile.email)}
              </div>
            )}
            <button
              className={styles.avatarEditBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
            >
              <span className="material-icons">photo_camera</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: "none" }}
            />
          </div>
          
          <div className={styles.profileMeta}>
            <h2 className={styles.profileName}>
              {profile.fullName || "Не указано"}
            </h2>
            <p className={styles.profileEmail}>{profile.email}</p>
            <p className={styles.profileDate}>
              На платформе с {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <div className={styles.infoSection}>
            <div className={styles.infoGroup}>
              <label className={styles.infoLabel}>Полное имя</label>
              <p className={styles.infoValue}>{profile.fullName || "—"}</p>
            </div>

            <div className={styles.infoGroup}>
              <label className={styles.infoLabel}>Email</label>
              <p className={styles.infoValue}>{profile.email}</p>
            </div>

            <div className={styles.infoGroup}>
              <label className={styles.infoLabel}>Телефон</label>
              <p className={styles.infoValue}>{profile.phone || "—"}</p>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  setEditForm({
                    fullName: profile.fullName || "",
                    phone: profile.phone || "",
                  });
                  setIsEditing(true);
                }}
              >
                <span className="material-icons">edit</span>
                Редактировать профиль
              </button>

              <button
                className={styles.btnSecondary}
                onClick={() => setShowPasswordModal(true)}
              >
                <span className="material-icons">lock</span>
                Сменить пароль
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.editSection}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Полное имя</label>
              <input
                type="text"
                className={styles.formInput}
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                placeholder="Введите ваше имя"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Телефон</label>
              <input
                type="tel"
                className={styles.formInput}
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div className={styles.actions}>
              <button
                className={styles.btnPrimary}
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно смены пароля */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Смена пароля</h3>
              <button
                className={styles.closeBtn}
                onClick={() => setShowPasswordModal(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Текущий пароль</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  placeholder="Введите текущий пароль"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Новый пароль</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  placeholder="Минимум 6 символов"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Подтвердите пароль</label>
                <input
                  type="password"
                  className={styles.formInput}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  placeholder="Повторите новый пароль"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowPasswordModal(false)}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleChangePassword}
                disabled={isSaving}
              >
                {isSaving ? "Изменение..." : "Изменить пароль"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
