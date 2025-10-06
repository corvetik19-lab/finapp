"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./UserProfileDropdown.module.css";

type UserData = {
  email: string;
  fullName: string;
  avatar: string | null;
};

type UserProfileDropdownProps = {
  userData: UserData;
};

export default function UserProfileDropdown({ userData }: UserProfileDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string, email: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name[0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

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

  // Закрытие при клике вне dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.trigger} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Меню профиля"
      >
        {userData.avatar ? (
          <Image 
            src={userData.avatar} 
            alt="Avatar" 
            className={styles.avatar} 
            width={40} 
            height={40}
            unoptimized={userData.avatar.startsWith('data:')}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {getInitials(userData.fullName, userData.email)}
          </div>
        )}
        <div className={styles.userInfo}>
          <div className={styles.userName}>
            {userData.fullName || userData.email}
          </div>
          <div className={styles.userEmail}>{userData.email}</div>
        </div>
        <span className={`material-icons ${styles.chevron} ${isOpen ? styles.open : ""}`}>
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <Link 
            href="/settings" 
            className={styles.dropdownItem}
            onClick={() => setIsOpen(false)}
          >
            <span className="material-icons">person</span>
            <span>Мой профиль</span>
          </Link>

          <Link 
            href="/settings" 
            className={styles.dropdownItem}
            onClick={() => setIsOpen(false)}
          >
            <span className="material-icons">settings</span>
            <span>Настройки</span>
          </Link>

          <div className={styles.divider}></div>

          <button 
            className={styles.dropdownItem}
            onClick={handleSignOut}
          >
            <span className="material-icons">logout</span>
            <span>Выйти</span>
          </button>
        </div>
      )}
    </div>
  );
}
