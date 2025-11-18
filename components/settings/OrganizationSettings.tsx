"use client";

import { useState } from "react";
import type { Organization } from "@/lib/platform/organization";
import styles from "./OrganizationSettings.module.css";

interface OrganizationSettingsProps {
  organization: Organization;
}

export default function OrganizationSettings({ organization }: OrganizationSettingsProps) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organization/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      if (!response.ok) {
        throw new Error("Ошибка обновления организации");
      }

      setMessage({ type: "success", text: "Организация успешно обновлена" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Произошла ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Управление организацией</h1>
          <p className={styles.subtitle}>Настройте основную информацию о вашей организации</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Основная информация */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Основная информация</h2>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                Название организации
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="slug" className={styles.label}>
                Slug (URL идентификатор)
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                className={styles.input}
                pattern="[a-z0-9-]+"
                required
              />
              <p className={styles.hint}>Только строчные буквы, цифры и дефисы</p>
            </div>

            {message && (
              <div className={`${styles.message} ${styles[message.type]}`}>
                <span className="material-icons">
                  {message.type === "success" ? "check_circle" : "error"}
                </span>
                {message.text}
              </div>
            )}

            <button type="submit" className={styles.button} disabled={isLoading}>
              {isLoading ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </form>
        </section>

        {/* Подписка */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Подписка</h2>
          
          <div className={styles.subscriptionCard}>
            <div className={styles.subscriptionHeader}>
              <span className="material-icons" style={{ fontSize: 32, color: "var(--primary)" }}>
                workspace_premium
              </span>
              <div>
                <h3 className={styles.subscriptionTier}>
                  {organization.subscription_tier === "free" && "Бесплатный план"}
                  {organization.subscription_tier === "pro" && "Pro план"}
                  {organization.subscription_tier === "enterprise" && "Enterprise план"}
                </h3>
                <p className={styles.subscriptionDesc}>
                  {organization.subscription_tier === "free" && "Базовые функции для начала работы"}
                  {organization.subscription_tier === "pro" && "Расширенные возможности для бизнеса"}
                  {organization.subscription_tier === "enterprise" && "Полный набор функций"}
                </p>
              </div>
            </div>

            {organization.subscription_tier === "free" && (
              <button className={styles.upgradeButton}>
                <span className="material-icons">upgrade</span>
                Обновить до Pro
              </button>
            )}
          </div>
        </section>

        {/* Информация */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Дополнительная информация</h2>
          
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className="material-icons">calendar_today</span>
              <div>
                <p className={styles.infoLabel}>Дата создания</p>
                <p className={styles.infoValue}>
                  {new Date(organization.created_at).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <span className="material-icons">fingerprint</span>
              <div>
                <p className={styles.infoLabel}>ID организации</p>
                <p className={styles.infoValue}>{organization.id}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Опасная зона */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle} style={{ color: "var(--error)" }}>
            Опасная зона
          </h2>
          
          <div className={styles.dangerZone}>
            <div>
              <h3 className={styles.dangerTitle}>Удалить организацию</h3>
              <p className={styles.dangerDesc}>
                Это действие необратимо. Все данные организации будут удалены навсегда.
              </p>
            </div>
            <button className={styles.dangerButton}>
              <span className="material-icons">delete_forever</span>
              Удалить организацию
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
