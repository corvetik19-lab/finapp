'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Organization } from '@/lib/organizations/types';
import { UserProfile } from '@/lib/auth/types';
import { isSuperAdmin } from '@/lib/auth/types';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

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
    const router = useRouter();
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
                // Обновляем страницу чтобы изменения отразились в хедере
                router.refresh();
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
            <div className="bg-card rounded-xl border p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-4 text-muted-foreground">Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Доступные режимы</h2>
                <p className="text-sm text-muted-foreground">
                    Управление модулями, доступными для этой организации
                </p>
            </div>

            {isSystemOrg && isSuper && (
                <div className="mb-4 p-4 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                    <p>
                        Это ваша системная организация. Вы можете включать и выключать режимы для себя. Минимум один режим должен быть включён.
                    </p>
                </div>
            )}

            {!isSuper && (
                <div className="mb-4 p-4 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
                    <p>
                        Только администраторы могут изменять доступные режимы для организаций.
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {MODES.map((mode) => {
                    const setting = modeSettings.find((s) => s.mode_key === mode.key);
                    // Для системной организации по умолчанию все включены, но можно изменить
                    const isEnabled = setting?.is_enabled ?? true;
                    
                    // Проверяем можно ли отключить (минимум 1 режим должен быть включён)
                    const enabledCount = modeSettings.filter(s => s.is_enabled).length || MODES.length;
                    const canDisable = enabledCount > 1 || !isEnabled;

                    return (
                        <div key={mode.key} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{mode.icon}</span>
                                <div>
                                    <h3 className="font-medium">{mode.label}</h3>
                                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {isEnabled && !canDisable && (
                                    <span className="text-xs text-amber-600">Последний активный</span>
                                )}
                                <Switch
                                    checked={isEnabled}
                                    onCheckedChange={() => handleToggleMode(mode.key, isEnabled)}
                                    disabled={!isSuper || saving || (isEnabled && !canDisable)}
                                />
                                <span className={cn(
                                    "text-sm font-medium min-w-[80px]",
                                    isEnabled ? "text-green-600" : "text-muted-foreground"
                                )}>
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
