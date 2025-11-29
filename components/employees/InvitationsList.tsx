'use client';

import { useState, useEffect } from 'react';
import styles from './InvitationsList.module.css';

interface Invitation {
  id: string;
  email: string;
  position: string | null;
  department: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  role?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface InvitationsListProps {
  companyId: string;
  onInvite?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: '#f59e0b' },
  accepted: { label: 'Принято', color: '#22c55e' },
  expired: { label: 'Истекло', color: '#94a3b8' },
  cancelled: { label: 'Отменено', color: '#ef4444' }
};

export function InvitationsList({ companyId, onInvite }: InvitationsListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/invitations?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (err) {
      console.error('Error loading invitations:', err);
      setError('Ошибка загрузки приглашений');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Отменить приглашение?')) return;

    try {
      const response = await fetch(`/api/employees/invitations?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setInvitations(invitations.map(inv => 
          inv.id === id ? { ...inv, status: 'cancelled' as const } : inv
        ));
      }
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      setError('Ошибка отмены приглашения');
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    alert('Ссылка скопирована!');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка приглашений...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>📧 Приглашения</h4>
        {onInvite && (
          <button onClick={onInvite} className={styles.inviteButton}>
            ➕ Пригласить
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {invitations.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📭</span>
          <p>Нет приглашений</p>
        </div>
      ) : (
        <div className={styles.list}>
          {invitations.map((inv) => (
            <div key={inv.id} className={styles.invitation}>
              <div className={styles.invInfo}>
                <div className={styles.email}>{inv.email}</div>
                <div className={styles.meta}>
                  {inv.position && <span>{inv.position}</span>}
                  {inv.department && <span>{inv.department}</span>}
                  {inv.role && (
                    <span 
                      className={styles.role}
                      style={{ background: inv.role.color }}
                    >
                      {inv.role.name}
                    </span>
                  )}
                </div>
                <div className={styles.dates}>
                  <span>Создано: {new Date(inv.created_at).toLocaleDateString('ru-RU')}</span>
                  {inv.status === 'pending' && (
                    <span>Истекает: {new Date(inv.expires_at).toLocaleDateString('ru-RU')}</span>
                  )}
                </div>
              </div>
              <div className={styles.invActions}>
                <span 
                  className={styles.status}
                  style={{ 
                    background: STATUS_LABELS[inv.status].color,
                    color: 'white'
                  }}
                >
                  {STATUS_LABELS[inv.status].label}
                </span>
                {inv.status === 'pending' && (
                  <>
                    <button
                      onClick={() => copyInviteLink((inv as Invitation & { token?: string }).token || inv.id)}
                      className={styles.actionButton}
                      title="Копировать ссылку"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleCancel(inv.id)}
                      className={styles.actionButton}
                      title="Отменить"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
