'use client';

import { useState } from 'react';
import { createOrganization } from '@/lib/admin/organizations';
import { useRouter } from 'next/navigation';
import styles from './CreateOrganizationModal.module.css';

interface CreateOrganizationModalProps {
    users?: {
        id: string;
        email?: string;
        full_name?: string;
        global_role?: string;
    }[];
}

const MODES = [
    { key: 'finance', label: 'Финансы' },
    { key: 'tenders', label: 'Тендеры' },
    { key: 'investments', label: 'Инвестиции' },
    { key: 'personal', label: 'Личные' },
];

export function CreateOrganizationModal({ users = [] }: CreateOrganizationModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedModes, setSelectedModes] = useState<string[]>(['finance', 'tenders']);
    const [ownerId, setOwnerId] = useState<string>('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            // Добавляем режимы и владельца, если они не попали (хотя скрытые инпуты должны сработать)
            // Но надежнее использовать скрытые инпуты внутри формы
            await createOrganization(formData);
            setIsOpen(false);
            router.refresh();
        } catch (error) {
            alert('Ошибка при создании организации');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = (modeKey: string) => {
        setSelectedModes(prev => 
            prev.includes(modeKey) 
                ? prev.filter(k => k !== modeKey)
                : [...prev, modeKey]
        );
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                }}
            >
                <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>+</span>
                Создать организацию
            </button>
        );
    }

    return (
        <div className={styles.modal} onClick={() => setIsOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Новая организация</h3>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className={styles.modalClose}
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Скрытые поля для передачи данных в Server Action */}
                    <input type="hidden" name="allowed_modes" value={JSON.stringify(selectedModes)} />
                    <input type="hidden" name="owner_id" value={ownerId} />

                    <div className={styles.modalBody}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Название организации</label>
                            <input
                                name="name"
                                required
                                type="text"
                                className={styles.input}
                                placeholder="ООО Ромашка"
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Описание</label>
                            <textarea
                                name="description"
                                className={styles.textarea}
                                placeholder="Краткое описание деятельности организации..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <div className={styles.sectionHeader}>Владелец</div>
                            <label className={styles.label}>Выберите администратора организации</label>
                            <select 
                                className={styles.select}
                                value={ownerId}
                                onChange={(e) => setOwnerId(e.target.value)}
                            >
                                <option value="">-- Не назначен (создать без владельца) --</option>
                                {users
                                    .filter(u => u.global_role !== 'super_admin')
                                    .map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.email} {user.full_name ? `(${user.full_name})` : ''}
                                    </option>
                                ))}
                            </select>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                                Выбранный пользователь автоматически станет администратором новой компании.
                            </p>
                        </div>

                        <div className={styles.formGroup}>
                            <div className={styles.sectionHeader}>Доступные режимы</div>
                            <div className={styles.checkboxList}>
                                {MODES.map(mode => (
                                    <label key={mode.key} className={styles.checkboxItem}>
                                        <input 
                                            type="checkbox" 
                                            className={styles.checkbox}
                                            checked={selectedModes.includes(mode.key)}
                                            onChange={() => toggleMode(mode.key)}
                                        />
                                        <span className={styles.checkboxLabel}>{mode.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className={`${styles.btn} ${styles.btnSecondary}`}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`${styles.btn} ${styles.btnPrimary}`}
                        >
                            {loading ? 'Создание...' : 'Создать'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
