'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Settings {
  deadline_approaching_enabled: boolean;
  deadline_approaching_days: number;
  deadline_passed_enabled: boolean;
  stage_changed_enabled: boolean;
  assigned_enabled: boolean;
  comment_added_enabled: boolean;
  file_uploaded_enabled: boolean;
  status_changed_enabled: boolean;
  email_enabled: boolean;
  email_frequency: string;
  push_enabled: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/tenders/notifications/settings');
      if (!response.ok) throw new Error('Failed');
      
      const data = await response.json();
      setSettings(data.data || getDefaultSettings());
    } catch (error) {
      console.error('Error:', error);
      setSettings(getDefaultSettings());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const getDefaultSettings = (): Settings => ({
    deadline_approaching_enabled: true,
    deadline_approaching_days: 3,
    deadline_passed_enabled: true,
    stage_changed_enabled: true,
    assigned_enabled: true,
    comment_added_enabled: true,
    file_uploaded_enabled: false,
    status_changed_enabled: true,
    email_enabled: false,
    email_frequency: 'instant',
    push_enabled: true,
  });

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/tenders/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, company_id: companyId }),
      });

      if (!response.ok) throw new Error('Failed');
      
      alert('Настройки сохранены!');
      router.push('/tenders/notifications');
    } catch (error) {
      console.error('Error:', error);
      alert('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">⚙️ Настройки уведомлений</h1>
          <p className="text-gray-600 mt-1">Управление типами и способами получения уведомлений</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          ← Назад
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Типы уведомлений</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">⏰ Приближается срок</div>
                <div className="text-sm text-gray-600">Уведомление за N дней до дедлайна</div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.deadline_approaching_days}
                  onChange={(e) => setSettings({ ...settings, deadline_approaching_days: parseInt(e.target.value) })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                  disabled={!settings.deadline_approaching_enabled}
                />
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.deadline_approaching_enabled}
                    onChange={(e) => setSettings({ ...settings, deadline_approaching_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">🚨 Срок прошел</div>
                <div className="text-sm text-gray-600">Уведомление о пропущенном дедлайне</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.deadline_passed_enabled}
                  onChange={(e) => setSettings({ ...settings, deadline_passed_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">🔄 Изменение этапа</div>
                <div className="text-sm text-gray-600">Уведомление при смене этапа тендера</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.stage_changed_enabled}
                  onChange={(e) => setSettings({ ...settings, stage_changed_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">👤 Назначение ответственным</div>
                <div className="text-sm text-gray-600">Уведомление при назначении на тендер</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.assigned_enabled}
                  onChange={(e) => setSettings({ ...settings, assigned_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">💬 Новый комментарий</div>
                <div className="text-sm text-gray-600">Уведомление о комментариях к тендеру</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.comment_added_enabled}
                  onChange={(e) => setSettings({ ...settings, comment_added_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">📎 Загрузка файла</div>
                <div className="text-sm text-gray-600">Уведомление о новых вложениях</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.file_uploaded_enabled}
                  onChange={(e) => setSettings({ ...settings, file_uploaded_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">📊 Изменение статуса</div>
                <div className="text-sm text-gray-600">Уведомление при смене статуса</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.status_changed_enabled}
                  onChange={(e) => setSettings({ ...settings, status_changed_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Способы доставки</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">🔔 Push-уведомления</div>
                <div className="text-sm text-gray-600">Уведомления в браузере</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.push_enabled}
                  onChange={(e) => setSettings({ ...settings, push_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900">📧 Email-уведомления</div>
                  <div className="text-sm text-gray-600">Отправка на почту</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.email_enabled}
                    onChange={(e) => setSettings({ ...settings, email_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {settings.email_enabled && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Частота отправки</label>
                  <select
                    value={settings.email_frequency}
                    onChange={(e) => setSettings({ ...settings, email_frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="instant">Мгновенно</option>
                    <option value="daily">Раз в день</option>
                    <option value="weekly">Раз в неделю</option>
                    <option value="never">Никогда</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Сохранение...' : '💾 Сохранить настройки'}
        </button>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
