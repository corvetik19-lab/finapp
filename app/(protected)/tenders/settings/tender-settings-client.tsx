'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Settings, Lightbulb } from 'lucide-react';

type TabType = 'stages' | 'notifications' | 'automation' | 'templates' | 'integrations';

interface Stage {
  id: string;
  name: string;
  category?: string;
  color?: string;
  order_index?: number;
  is_active?: boolean;
}

interface TenderSettingsClientProps {
  stages: Stage[];
}

export function TenderSettingsClient({ stages }: TenderSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('stages');

  const tabs = [
    { id: 'stages' as TabType, label: 'Этапы', icon: '📊' },
    { id: 'notifications' as TabType, label: 'Уведомления', icon: '🔔' },
    { id: 'automation' as TabType, label: 'Автоматизация', icon: '⚡' },
    { id: 'templates' as TabType, label: 'Шаблоны', icon: '📄' },
    { id: 'integrations' as TabType, label: 'Интеграции', icon: '🔗' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" />Настройки тендеров</h1><p className="text-muted-foreground">Управление этапами, уведомлениями, автоматизацией</p></div>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}><TabsList className="flex flex-wrap h-auto gap-1">{tabs.map(t => <TabsTrigger key={t.id} value={t.id}>{t.icon} {t.label}</TabsTrigger>)}</TabsList>
        <TabsContent value="stages"><StagesTab stages={stages} /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="automation"><AutomationTab /></TabsContent>
        <TabsContent value="templates"><TemplatesTab /></TabsContent>
        <TabsContent value="integrations"><IntegrationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function StagesTab({ stages }: { stages: Stage[] }) {
  return <div className="space-y-4 mt-4">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Управление этапами</h2><Button><Plus className="h-4 w-4 mr-1" />Добавить</Button></div>
    <Card><CardContent className="pt-4"><Table><TableHeader><TableRow><TableHead>№</TableHead><TableHead>Название</TableHead><TableHead>Категория</TableHead><TableHead>Цвет</TableHead><TableHead>Статус</TableHead><TableHead>Действия</TableHead></TableRow></TableHeader>
      <TableBody>{stages.map(s => <TableRow key={s.id}><TableCell>{s.order_index}</TableCell><TableCell className="font-medium">📌 {s.name}</TableCell><TableCell><Badge variant="outline">{s.category === 'tender_dept' ? 'Предконтракт' : 'Реализация'}</Badge></TableCell><TableCell><div className="w-6 h-6 rounded" style={{ backgroundColor: s.color || '#3b82f6' }} /></TableCell><TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Активен' : 'Неактивен'}</Badge></TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8">✏️</Button><Button variant="ghost" size="icon" className="h-8 w-8">⬆️</Button><Button variant="ghost" size="icon" className="h-8 w-8">⬇️</Button></div></TableCell></TableRow>)}</TableBody>
    </Table></CardContent></Card>
    <Alert><Lightbulb className="h-4 w-4" /><AlertDescription><strong>Совет:</strong> Порядок этапов определяет последовательность перемещения.</AlertDescription></Alert>
  </div>;
}

function NotificationsTab() {
  const [settings, setSettings] = useState({ deadlineReminder: true, stageChange: true, newTender: false, documentExpiry: true, emailNotifications: true, telegramNotifications: false });
  const toggle = (k: keyof typeof settings) => setSettings(p => ({ ...p, [k]: !p[k] }));
  const SettingRow = ({ icon, label, desc, checked, onToggle }: { icon: string; label: string; desc: string; checked: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between p-3 border-b last:border-0"><div><div className="font-medium flex items-center gap-2"><span>{icon}</span>{label}</div><p className="text-sm text-muted-foreground">{desc}</p></div><input type="checkbox" checked={checked} onChange={onToggle} className="h-5 w-5" /></div>
  );
  return <div className="space-y-4 mt-4"><h2 className="text-lg font-semibold">Уведомления</h2>
    <Card><CardHeader><CardTitle className="text-base">События</CardTitle></CardHeader><CardContent className="p-0">
      <SettingRow icon="⏰" label="Дедлайны" desc="Уведомления за 24ч до срока" checked={settings.deadlineReminder} onToggle={() => toggle('deadlineReminder')} />
      <SettingRow icon="🔄" label="Изменение этапа" desc="При перемещении тендера" checked={settings.stageChange} onToggle={() => toggle('stageChange')} />
      <SettingRow icon="➕" label="Новый тендер" desc="При добавлении" checked={settings.newTender} onToggle={() => toggle('newTender')} />
      <SettingRow icon="📄" label="Документы" desc="Об истекающих сроках" checked={settings.documentExpiry} onToggle={() => toggle('documentExpiry')} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Каналы</CardTitle></CardHeader><CardContent className="p-0">
      <SettingRow icon="📧" label="Email" desc="На эл.почту" checked={settings.emailNotifications} onToggle={() => toggle('emailNotifications')} />
      <SettingRow icon="💬" label="Telegram" desc="В Telegram" checked={settings.telegramNotifications} onToggle={() => toggle('telegramNotifications')} />
    </CardContent></Card>
  </div>;
}

function AutomationTab() {
  const [allowFreeMovement, setAllowFreeMovement] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('allowFreeMovement') === 'true' : false);
  const handleToggle = (c: boolean) => { setAllowFreeMovement(c); localStorage.setItem('allowFreeMovement', String(c)); };
  return <div className="space-y-4 mt-4"><h2 className="text-lg font-semibold">Автоматизация</h2>
    <Card><CardContent className="pt-4"><div className="flex items-center justify-between"><div><h3 className="font-medium">🔓 Свободное перемещение</h3><p className="text-sm text-muted-foreground">Перемещать тендеры в любой этап</p></div><input type="checkbox" checked={allowFreeMovement} onChange={e => handleToggle(e.target.checked)} className="h-5 w-5" /></div></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Автоперемещение</CardTitle></CardHeader><CardContent className="space-y-3">
      <div className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><span>⏰</span><div><h4 className="font-medium text-sm">Истёк срок</h4><p className="text-xs text-muted-foreground">→ Не подано</p></div></div><input type="checkbox" defaultChecked className="h-5 w-5" /></div>
      <div className="flex items-center justify-between p-2 border rounded"><div className="flex items-center gap-2"><span>📄</span><div><h4 className="font-medium text-sm">Документы готовы</h4><p className="text-xs text-muted-foreground">→ Подача</p></div></div><input type="checkbox" className="h-5 w-5" /></div>
      <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Добавить правило</Button>
    </CardContent></Card>
    <Alert><Lightbulb className="h-4 w-4" /><AlertDescription>🚧 Автоназначение ответственных — в разработке</AlertDescription></Alert>
  </div>;
}

function TemplatesTab() {
  const templates = [{ icon: '📄', title: 'Заявка на участие', desc: 'Стандартный шаблон' }, { icon: '📋', title: 'Коммерческое предложение', desc: 'Шаблон КП' }, { icon: '📊', title: 'Отчёт по тендеру', desc: 'Итоговый отчёт' }];
  return <div className="space-y-4 mt-4">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Шаблоны</h2><Button><Plus className="h-4 w-4 mr-1" />Создать</Button></div>
    <div className="grid md:grid-cols-3 gap-4">{templates.map((t, i) => <Card key={i}><CardContent className="pt-4"><div className="text-3xl mb-2">{t.icon}</div><h3 className="font-medium">{t.title}</h3><p className="text-sm text-muted-foreground">{t.desc}</p><div className="flex gap-2 mt-3"><Button variant="outline" size="sm">Редактировать</Button><Button variant="ghost" size="icon" className="h-8 w-8">⋮</Button></div></CardContent></Card>)}</div>
  </div>;
}

function IntegrationsTab() {
  const integrations = [{ icon: '🌐', title: 'ЕИС', desc: 'Импорт из zakupki.gov.ru', active: false }, { icon: '📧', title: 'Email', desc: 'Уведомления по почте', active: true }, { icon: '💬', title: 'Telegram', desc: 'Уведомления в бот', active: false }, { icon: '📊', title: '1С', desc: 'Синхронизация', active: false }];
  return <div className="space-y-4 mt-4"><h2 className="text-lg font-semibold">Интеграции</h2>
    <div className="grid md:grid-cols-2 gap-4">{integrations.map((i, idx) => <Card key={idx}><CardContent className="pt-4"><div className="flex items-center gap-2 mb-2"><span className="text-2xl">{i.icon}</span><h3 className="font-medium">{i.title}</h3></div><p className="text-sm text-muted-foreground mb-3">{i.desc}</p><Badge variant={i.active ? 'default' : 'secondary'} className="mb-3">{i.active ? 'Подключено' : 'Не подключено'}</Badge><br /><Button variant={i.active ? 'outline' : 'default'} size="sm">Настроить</Button></CardContent></Card>)}</div>
  </div>;
}
