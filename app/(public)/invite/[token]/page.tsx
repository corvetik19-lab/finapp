'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import styles from './invite.module.css';

interface InvitationInfo {
  id: string;
  email: string;
  position: string | null;
  department: string | null;
  company: {
    id: string;
    name: string;
  };
  role: {
    id: string;
    name: string;
    color: string;
  } | null;
  expires_at: string;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  });

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const response = await fetch(`/api/employees/invitations/accept?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Ошибка загрузки приглашения');
          return;
        }

        setInvitation(data);
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Ошибка загрузки приглашения');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name.trim()) {
      setError('Введите ваше имя');
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch('/api/employees/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          full_name: formData.full_name,
          phone: formData.phone || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка принятия приглашения');
        return;
      }

      // Перенаправляем в личный кабинет
      router.push('/tenders');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Ошибка принятия приглашения');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <span>⏳</span> Загрузка приглашения...
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <span className={styles.errorIcon}>❌</span>
            <h2>Ошибка</h2>
            <p>{error}</p>
            <a href="/login" className={styles.link}>
              Войти в систему
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.icon}>🎉</span>
          <h1>Приглашение в команду</h1>
        </div>

        <div className={styles.companyInfo}>
          <p>Вас приглашают присоединиться к компании</p>
          <h2 className={styles.companyName}>{invitation.company.name}</h2>
        </div>

        <div className={styles.details}>
          {invitation.position && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Должность:</span>
              <span className={styles.detailValue}>{invitation.position}</span>
            </div>
          )}
          {invitation.department && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Отдел:</span>
              <span className={styles.detailValue}>{invitation.department}</span>
            </div>
          )}
          {invitation.role && (
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Роль:</span>
              <span 
                className={styles.roleBadge}
                style={{ background: invitation.role.color }}
              >
                {invitation.role.name}
              </span>
            </div>
          )}
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Email:</span>
            <span className={styles.detailValue}>{invitation.email}</span>
          </div>
        </div>

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <form onSubmit={handleAccept} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Ваше имя *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <button
            type="submit"
            disabled={accepting}
            className={styles.acceptButton}
          >
            {accepting ? '⏳ Принятие...' : '✅ Принять приглашение'}
          </button>
        </form>

        <p className={styles.note}>
          Приглашение действительно до {new Date(invitation.expires_at).toLocaleDateString('ru-RU')}
        </p>
      </div>
    </div>
  );
}
