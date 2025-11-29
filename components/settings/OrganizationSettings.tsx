"use client";

import { useState } from "react";
import type { Organization } from "@/lib/organizations/types";
import { deleteOrganization } from "@/lib/admin/organizations";
import { useRouter } from "next/navigation";
import styles from "./OrganizationSettings.module.css";

interface Member {
  id: string;
  role: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  plans: {
    id: string;
    name: string;
    price: number;
    billing_period: string;
    features: string[] | null;
  } | null;
}

interface OrganizationSettingsProps {
  organization: Organization;
  members?: Member[];
  subscription?: Subscription | null;
  stats?: {
    transactions: number;
    accounts: number;
    categories: number;
  };
  isAdmin?: boolean;
  currentUserId?: string;
}

export default function OrganizationSettings({ 
  organization, 
  members = [], 
  isAdmin = false,
  currentUserId
}: OrganizationSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug || '');
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

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить эту организацию? Это действие необратимо и удалит ВСЕ данные.")) {
      return;
    }

    // Второе подтверждение для надежности
    if (!confirm("Подтвердите удаление. Организация будет удалена навсегда.")) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteOrganization(organization.id);
      router.push("/admin/organizations");
    } catch (error) {
      console.error("Error deleting organization:", error);
      alert("Ошибка при удалении организации: " + (error instanceof Error ? error.message : String(error)));
      setIsLoading(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner': return 'Владелец';
      case 'admin': return 'Администратор';
      case 'member': return 'Участник';
      case 'viewer': return 'Наблюдатель';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#8b5cf6';
      case 'admin': return '#3b82f6';
      case 'member': return '#22c55e';
      case 'viewer': return '#64748b';
      default: return '#64748b';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Информация об организации</h1>
          <p className={styles.subtitle}>Просмотр и управление данными вашей организации</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Основная информация */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className="material-icons" style={{ marginRight: 8, color: 'var(--primary)' }}>business</span>
            Основная информация
          </h2>
          
          {isAdmin ? (
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
          ) : (
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className="material-icons">badge</span>
                <div>
                  <p className={styles.infoLabel}>Название</p>
                  <p className={styles.infoValue}>{organization.name}</p>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className="material-icons">link</span>
                <div>
                  <p className={styles.infoLabel}>Slug</p>
                  <p className={styles.infoValue}>{organization.slug || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Участники */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className="material-icons" style={{ marginRight: 8, color: 'var(--primary)' }}>group</span>
            Участники организации ({members.length})
          </h2>
          
          <div className={styles.membersList}>
            {members.map((member) => (
              <div 
                key={member.id} 
                className={`${styles.memberCard} ${member.profiles?.id === currentUserId ? styles.currentUser : ''}`}
              >
                <div className={styles.memberAvatar}>
                  {member.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.profiles.avatar_url} alt="" />
                  ) : (
                    <span>{(member.profiles?.full_name || member.profiles?.email || '?')[0].toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <p className={styles.memberName}>
                    {member.profiles?.full_name || 'Без имени'}
                    {member.profiles?.id === currentUserId && <span className={styles.youBadge}>Вы</span>}
                  </p>
                  <p className={styles.memberEmail}>{member.profiles?.email || '—'}</p>
                </div>
                <div 
                  className={styles.memberRole}
                  style={{ background: `${getRoleColor(member.role)}20`, color: getRoleColor(member.role) }}
                >
                  {getRoleName(member.role)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Дополнительная информация */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span className="material-icons" style={{ marginRight: 8, color: 'var(--primary)' }}>info</span>
            Дополнительная информация
          </h2>
          
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
                <p className={styles.infoValue} style={{ fontSize: 12, fontFamily: 'monospace' }}>{organization.id}</p>
              </div>
            </div>

            {organization.allowed_modes && organization.allowed_modes.length > 0 && (
              <div className={styles.infoItem}>
                <span className="material-icons">apps</span>
                <div>
                  <p className={styles.infoLabel}>Доступные режимы</p>
                  <p className={styles.infoValue}>{organization.allowed_modes.join(', ')}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Опасная зона - только для админов */}
        {isAdmin && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle} style={{ color: "var(--error)" }}>
              <span className="material-icons" style={{ marginRight: 8 }}>warning</span>
              Опасная зона
            </h2>
            
            <div className={styles.dangerZone}>
              <div>
                <h3 className={styles.dangerTitle}>Удалить организацию</h3>
                <p className={styles.dangerDesc}>
                  Это действие необратимо. Все данные организации будут удалены навсегда.
                </p>
              </div>
              <button 
                className={styles.dangerButton} 
                onClick={handleDelete}
                disabled={isLoading}
              >
                <span className="material-icons">delete_forever</span>
                {isLoading ? "Удаление..." : "Удалить организацию"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
