"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./UserMenu.module.css";

interface UserMenuProps {
  user: {
    email?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const userInitial = user.full_name?.[0] || user.email?.[0] || "U";

  const handleSignOut = async () => {
    const response = await fetch("/auth/signout", { method: "POST" });
    if (response.ok) {
      router.push("/login");
      router.refresh();
    }
  };

  const menuItems = [
    {
      icon: "person",
      label: "Профиль",
      href: "/settings/profile",
    },
    {
      icon: "settings",
      label: "Настройки",
      href: "/settings",
    },
    {
      icon: "business",
      label: "Организация",
      href: "/settings/organization",
    },
    {
      icon: "help",
      label: "Помощь",
      href: "/help",
    },
  ];

  return (
    <div className={styles.userMenu}>
      <button
        className={styles.userMenuButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Меню пользователя"
      >
        <div className={styles.userAvatar}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name || "User"} />
          ) : (
            <span>{userInitial.toUpperCase()}</span>
          )}
        </div>
        {user.full_name && (
          <span className={styles.userName}>{user.full_name}</span>
        )}
        <span className="material-icons">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className={styles.userMenuOverlay}
            onClick={() => setIsOpen(false)}
          />
          <div className={styles.userMenuDropdown}>
            <div className={styles.userMenuHeader}>
              <div className={styles.userAvatarLarge}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name || "User"} />
                ) : (
                  <span>{userInitial.toUpperCase()}</span>
                )}
              </div>
              <div className={styles.userInfo}>
                <div className={styles.userFullName}>
                  {user.full_name || "Пользователь"}
                </div>
                <div className={styles.userEmail}>{user.email}</div>
              </div>
            </div>

            <div className={styles.userMenuDivider} />

            <div className={styles.userMenuList}>
              {menuItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={styles.userMenuItem}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="material-icons">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              ))}
            </div>

            <div className={styles.userMenuDivider} />

            <button
              className={`${styles.userMenuItem} ${styles.userMenuItemDanger}`}
              onClick={handleSignOut}
            >
              <span className="material-icons">logout</span>
              <span>Выйти</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
