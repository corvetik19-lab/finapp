'use client';

import { useState, useEffect, useCallback } from 'react';
import { Organization } from '@/lib/organizations/types';
import { UserProfile } from '@/lib/auth/types';
import { isSuperAdmin } from '@/lib/auth/types';
import styles from './OrganizationDetails.module.css';

interface OrganizationModesProps {
    organization: Organization;
    profile: UserProfile;
}

interface ModeSettings {
    id: string;
    org_id: string;
    mode_key: string;
    is_enabled: boolean;
    settings: Record<string, unknown>;
}

const MODES = [
    { key: 'finance', label: 'Финансы', icon: '💰', description: 'Модуль управления финансами' },
    { key: 'personal', label: 'Личные', icon: '📝', description: 'Персональные задачи и заметки' },
    { key: 'investments', label: 'Инвестиции', icon: '📈', description: 'Управление инвестициями' },
    { key: 'tenders', label: 'Тендеры', icon: '📋', description: 'Система управления тендерами' },
];

export function OrganizationModes({ organization, profile }: OrganizationModesProps) {
    const [modeSettings, setModeSettings] = useState<ModeSettings[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const isSuper = isSuperAdmin(profile);
    const isSystemOrg = organization.name === 'Личное пространство';

    const loadModeSettings = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/organizations/${organization.id}/modes`);
            if (response.ok) {
                const data = await response.json();
                setModeSettings(data);
            }
        } catch (error) {
            console.error('Error loading mode settings:', error);
        } finally {
            setLoading(false);
        }
    }, [organization.id]);

    useEffect(() => {
        loadModeSettings();
    }, [loadModeSettings]);

    const handleToggleMode = async (modeKey: string, currentEnabled: boolean) => {
        if (!isSuper) return;

        try {
            setSaving(true);
            const response = await fetch(`/api/admin/organizations/${organization.id}/modes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode_key: modeKey,
                    is_enabled: !currentEnabled,
                }),
            });

            if (response.ok) {
                await loadModeSettings();
            } else {
                alert('Ошибка при обновлении режима');
            }
        } catch (error) {
            console.error('Error toggling mode:', error);
            alert('Ошибка при обновлении режима');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.modesCard}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p style={{ marginTop: '1rem' }}>Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modesCard}>
            <div className={styles.modesHeader}>
                <h2 className={styles.modesTitle}>Доступные режимы</h2>
                <p className={styles.modesDescription}>
                    Управление модулями, доступными для этой организации
                </p>
            </div>

            {isSystemOrg && (
                <div className={styles.warning} style={{ backgroundColor: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' }}>
                    <p>
                        Это системная организация супер-администратора. Все режимы включены по умолчанию и не могут быть изменены.
                    </p>
                </div>
            )}

            {!isSuper && !isSystemOrg && (
                <div className={styles.warning}>
                    <p>
                        Только супер-админы могут изменять доступные режимы для организаций.
                    </p>
                </div>
            )}

            <div className={styles.modesList}>
                {MODES.map((mode) => {
                    const setting = modeSettings.find((s) => s.mode_key === mode.key);
                    // Для системной организации всегда true визуально (даже если API вернул false, хотя в БД мы записали true)
                    const isEnabled = isSystemOrg ? true : (setting?.is_enabled ?? false);

                    return (
                        <div key={mode.key} className={styles.modeItem}>
                            <div className={styles.modeInfo}>
                                <span className={styles.modeIcon}>{mode.icon}</span>
                                <div className={styles.modeDetails}>
                                    <h3>{mode.label}</h3>
                                    <p>{mode.description}</p>
                                </div>
                            </div>
                            <div className={styles.modeControls}>
                                <button
                                    onClick={() => handleToggleMode(mode.key, isEnabled)}
                                    disabled={!isSuper || saving || isSystemOrg}
                                    className={`${styles.toggle} ${isEnabled ? styles.toggleEnabled : styles.toggleDisabled}`}
                                >
                                    <span className={`${styles.toggleKnob} ${isEnabled ? styles.toggleKnobEnabled : ''}`} />
                                </button>
                                <span className={styles.toggleLabel}>
                                    {isEnabled ? 'Включен' : 'Выключен'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
