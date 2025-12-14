"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Lock, Sparkles, Gavel, RotateCcw, Loader2, ShieldCheck, CheckSquare, Square } from "lucide-react";

export type RoleRecord = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  is_default: boolean;
  is_system?: boolean;
  allowed_modes?: string[] | null;
  created_at: string;
};

type RolesManagerProps = {
  roles: RoleRecord[];
  companyId?: string | null;
};

// Права для всех модулей платформы
const AVAILABLE_PERMISSIONS = [
  // --- Финансы ---
  { id: "finance:view", label: "Доступ к модулю Финансы", category: "Финансы" },
  { id: "finance:create", label: "Создание транзакций", category: "Финансы" },
  { id: "finance:edit", label: "Редактирование транзакций", category: "Финансы" },
  { id: "finance:delete", label: "Удаление транзакций", category: "Финансы" },
  { id: "finance:reports", label: "Просмотр отчётов", category: "Финансы" },
  { id: "finance:budgets", label: "Управление бюджетами", category: "Финансы" },
  { id: "finance:categories", label: "Управление категориями", category: "Финансы" },
  { id: "finance:accounts", label: "Управление счетами", category: "Финансы" },
  { id: "finance:import", label: "Импорт данных", category: "Финансы" },
  { id: "finance:export", label: "Экспорт данных", category: "Финансы" },

  // --- Инвестиции ---
  { id: "investments:view", label: "Доступ к модулю Инвестиции", category: "Инвестиции" },
  { id: "investments:create", label: "Создание операций", category: "Инвестиции" },
  { id: "investments:edit", label: "Редактирование операций", category: "Инвестиции" },
  { id: "investments:delete", label: "Удаление операций", category: "Инвестиции" },
  { id: "investments:portfolio", label: "Управление портфелем", category: "Инвестиции" },
  { id: "investments:analytics", label: "Аналитика доходности", category: "Инвестиции" },
  { id: "investments:dividends", label: "Учёт дивидендов", category: "Инвестиции" },
  { id: "investments:reports", label: "Отчёты по инвестициям", category: "Инвестиции" },

  // --- Личные ---
  { id: "personal:view", label: "Доступ к модулю Личные", category: "Личные" },
  { id: "personal:notes", label: "Заметки", category: "Личные" },
  { id: "personal:tasks", label: "Задачи", category: "Личные" },
  { id: "personal:bookmarks", label: "Закладки", category: "Личные" },
  { id: "personal:prompts", label: "Промпты AI", category: "Личные" },
  { id: "personal:fitness", label: "Фитнес-трекер", category: "Личные" },

  // --- Тендеры: Общие ---
  { id: "tenders:view", label: "Доступ к модулю", category: "Тендеры: Общие" },
  { id: "tenders:view_all", label: "Просмотр всех тендеров", category: "Тендеры: Общие" },
  { id: "tenders:view_own", label: "Просмотр только своих тендеров", category: "Тендеры: Общие" },
  { id: "tenders:create", label: "Создание тендеров", category: "Тендеры: Общие" },
  { id: "tenders:edit", label: "Редактирование тендеров", category: "Тендеры: Общие" },
  { id: "tenders:edit_own", label: "Редактирование только своих", category: "Тендеры: Общие" },
  { id: "tenders:delete", label: "Удаление тендеров", category: "Тендеры: Общие" },
  { id: "tenders:import", label: "Импорт тендеров из ЕИС", category: "Тендеры: Общие" },
  { id: "tenders:export", label: "Экспорт тендеров", category: "Тендеры: Общие" },

  // --- Тендеры: Канбан и этапы ---
  { id: "tenders:stages", label: "Управление этапами (Канбан)", category: "Тендеры: Этапы" },
  { id: "tenders:stages:move_forward", label: "Перемещение вперёд по этапам", category: "Тендеры: Этапы" },
  { id: "tenders:stages:move_backward", label: "Перемещение назад по этапам", category: "Тендеры: Этапы" },
  { id: "tenders:stages:archive", label: "Архивирование тендеров", category: "Тендеры: Этапы" },
  { id: "tenders:stages:restore", label: "Восстановление из архива", category: "Тендеры: Этапы" },

  // --- Тендеры: Просчёт ---
  { id: "tenders:calc:view", label: "Просмотр просчётов", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:create", label: "Создание просчётов", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:edit", label: "Редактирование просчётов", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:approve", label: "Утверждение просчётов", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:set_price", label: "Установка цены предложения", category: "Тендеры: Просчёт" },
  { id: "tenders:calc:view_margin", label: "Просмотр маржинальности", category: "Тендеры: Просчёт" },

  // --- Тендеры: Документы ---
  { id: "tenders:docs:view", label: "Просмотр документов", category: "Тендеры: Документы" },
  { id: "tenders:docs:upload", label: "Загрузка документов", category: "Тендеры: Документы" },
  { id: "tenders:docs:delete", label: "Удаление документов", category: "Тендеры: Документы" },
  { id: "tenders:docs:download", label: "Скачивание документов", category: "Тендеры: Документы" },
  { id: "tenders:docs:sign", label: "Подписание документов", category: "Тендеры: Документы" },

  // --- Тендеры: Проверка ---
  { id: "tenders:review:view", label: "Просмотр на проверке", category: "Тендеры: Проверка" },
  { id: "tenders:review:approve", label: "Одобрение заявки", category: "Тендеры: Проверка" },
  { id: "tenders:review:reject", label: "Отклонение заявки", category: "Тендеры: Проверка" },
  { id: "tenders:review:comment", label: "Комментирование заявки", category: "Тендеры: Проверка" },
  { id: "tenders:review:return", label: "Возврат на доработку", category: "Тендеры: Проверка" },

  // --- Тендеры: Торги ---
  { id: "tenders:auction:view", label: "Просмотр торгов", category: "Тендеры: Торги" },
  { id: "tenders:auction:participate", label: "Участие в торгах", category: "Тендеры: Торги" },
  { id: "tenders:auction:set_result", label: "Установка результатов", category: "Тендеры: Торги" },

  // --- Тендеры: Контракт ---
  { id: "tenders:contract:view", label: "Просмотр контрактов", category: "Тендеры: Контракт" },
  { id: "tenders:contract:create", label: "Создание контракта", category: "Тендеры: Контракт" },
  { id: "tenders:contract:edit", label: "Редактирование контракта", category: "Тендеры: Контракт" },
  { id: "tenders:contract:sign", label: "Подписание контракта", category: "Тендеры: Контракт" },
  { id: "tenders:contract:close", label: "Закрытие контракта", category: "Тендеры: Контракт" },

  // --- Тендеры: Назначения ---
  { id: "tenders:assign:manager", label: "Назначение менеджера", category: "Тендеры: Назначения" },
  { id: "tenders:assign:specialist", label: "Назначение специалиста", category: "Тендеры: Назначения" },
  { id: "tenders:assign:calculator", label: "Назначение просчётчика", category: "Тендеры: Назначения" },
  { id: "tenders:assign:reviewer", label: "Назначение проверяющего", category: "Тендеры: Назначения" },
  { id: "tenders:assign:executor", label: "Назначение исполнителя", category: "Тендеры: Назначения" },

  // --- Тендеры: Аналитика ---
  { id: "tenders:analytics:view", label: "Просмотр аналитики", category: "Тендеры: Аналитика" },
  { id: "tenders:analytics:reports", label: "Формирование отчётов", category: "Тендеры: Аналитика" },
  { id: "tenders:analytics:kpi", label: "Просмотр KPI сотрудников", category: "Тендеры: Аналитика" },
  { id: "tenders:analytics:finance", label: "Финансовая аналитика", category: "Тендеры: Аналитика" },
];

const ROLE_COLORS = [
  "#667eea", "#764ba2", "#f093fb", "#4facfe", 
  "#43e97b", "#fa709a", "#fee140", "#30cfd0",
  "#a8edea", "#ff6b6b", "#4ecdc4", "#95e1d3"
];

// Предустановленные шаблоны ролей
const ROLE_PRESETS = [
  {
    name: "Администратор организации",
    description: "Полный доступ ко всем модулям и функциям",
    permissions: [
      // Финансы
      "finance:view", "finance:create", "finance:edit", "finance:delete",
      "finance:reports", "finance:budgets", "finance:categories", "finance:accounts",
      "finance:import", "finance:export",
      // Инвестиции
      "investments:view", "investments:create", "investments:edit", "investments:delete",
      "investments:portfolio", "investments:analytics", "investments:dividends", "investments:reports",
      // Личные
      "personal:view", "personal:notes", "personal:tasks", "personal:bookmarks", "personal:prompts", "personal:fitness",
      // Тендеры
      "tenders:view", "tenders:view_all", "tenders:create", "tenders:edit", "tenders:delete",
      "tenders:import", "tenders:export",
      "tenders:stages", "tenders:stages:move_forward", "tenders:stages:move_backward", 
      "tenders:stages:archive", "tenders:stages:restore",
      "tenders:calc:view", "tenders:calc:create", "tenders:calc:edit", "tenders:calc:approve",
      "tenders:calc:set_price", "tenders:calc:view_margin",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:delete", "tenders:docs:download", "tenders:docs:sign",
      "tenders:review:view", "tenders:review:approve", "tenders:review:reject", "tenders:review:comment", "tenders:review:return",
      "tenders:auction:view", "tenders:auction:participate", "tenders:auction:set_result",
      "tenders:contract:view", "tenders:contract:create", "tenders:contract:edit", "tenders:contract:sign", "tenders:contract:close",
      "tenders:assign:manager", "tenders:assign:specialist", "tenders:assign:calculator", "tenders:assign:reviewer", "tenders:assign:executor",
      "tenders:analytics:view", "tenders:analytics:reports", "tenders:analytics:kpi", "tenders:analytics:finance",
      // Администрирование
      "employees:view", "employees:view_all", "employees:create", "employees:edit", "employees:delete",
      "users:manage", "roles:manage", "org:settings", "audit:view"
    ],
    color: "#e11d48"
  },
  {
    name: "Администратор тендеров",
    description: "Полный доступ ко всем функциям тендерного модуля",
    permissions: [
      // Финансы и Инвестиции (просмотр)
      "finance:view", "finance:reports", "investments:view", "investments:reports", "personal:view",
      // Тендеры (полный доступ)
      "tenders:view", "tenders:view_all", "tenders:create", "tenders:edit", "tenders:delete",
      "tenders:import", "tenders:export",
      "tenders:stages", "tenders:stages:move_forward", "tenders:stages:move_backward", 
      "tenders:stages:archive", "tenders:stages:restore",
      "tenders:calc:view", "tenders:calc:create", "tenders:calc:edit", "tenders:calc:approve",
      "tenders:calc:set_price", "tenders:calc:view_margin",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:delete", "tenders:docs:download", "tenders:docs:sign",
      "tenders:review:view", "tenders:review:approve", "tenders:review:reject", "tenders:review:comment", "tenders:review:return",
      "tenders:auction:view", "tenders:auction:participate", "tenders:auction:set_result",
      "tenders:contract:view", "tenders:contract:create", "tenders:contract:edit", "tenders:contract:sign", "tenders:contract:close",
      "tenders:assign:manager", "tenders:assign:specialist", "tenders:assign:calculator", "tenders:assign:reviewer", "tenders:assign:executor",
      "tenders:analytics:view", "tenders:analytics:reports", "tenders:analytics:kpi", "tenders:analytics:finance",
      // Сотрудники
      "employees:view", "employees:view_all", "employees:create", "employees:edit", "employees:delete",
      "users:manage", "roles:manage", "org:settings", "audit:view"
    ],
    color: "#667eea"
  },
  {
    name: "Менеджер тендеров",
    description: "Управление тендерами, назначение исполнителей, контроль этапов",
    permissions: [
      "tenders:view", "tenders:view_all", "tenders:create", "tenders:edit",
      "tenders:import", "tenders:export",
      "tenders:stages", "tenders:stages:move_forward", "tenders:stages:archive",
      "tenders:calc:view", "tenders:calc:approve", "tenders:calc:view_margin",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:download",
      "tenders:review:view", "tenders:review:comment",
      "tenders:auction:view", "tenders:auction:set_result",
      "tenders:contract:view", "tenders:contract:create", "tenders:contract:edit",
      "tenders:assign:specialist", "tenders:assign:calculator", "tenders:assign:executor",
      "tenders:analytics:view", "tenders:analytics:reports"
    ],
    color: "#3b82f6"
  },
  {
    name: "Просчётчик",
    description: "Расчёт стоимости, подготовка коммерческих предложений",
    permissions: [
      "tenders:view", "tenders:view_own",
      "tenders:stages:move_forward",
      "tenders:calc:view", "tenders:calc:create", "tenders:calc:edit", "tenders:calc:set_price",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:download"
    ],
    color: "#8b5cf6"
  },
  {
    name: "Отдел проверки",
    description: "Проверка и согласование заявок перед подачей",
    permissions: [
      "tenders:view", "tenders:view_all",
      "tenders:stages:move_forward", "tenders:stages:move_backward",
      "tenders:calc:view", "tenders:calc:view_margin",
      "tenders:docs:view", "tenders:docs:download",
      "tenders:review:view", "tenders:review:approve", "tenders:review:reject", 
      "tenders:review:comment", "tenders:review:return"
    ],
    color: "#f59e0b"
  },
  {
    name: "Специалист по торгам",
    description: "Участие в аукционах и электронных торгах",
    permissions: [
      "tenders:view", "tenders:view_own",
      "tenders:stages:move_forward",
      "tenders:calc:view",
      "tenders:docs:view", "tenders:docs:download",
      "tenders:auction:view", "tenders:auction:participate", "tenders:auction:set_result"
    ],
    color: "#10b981"
  },
  {
    name: "Контрактный менеджер",
    description: "Работа с контрактами и договорами",
    permissions: [
      "tenders:view", "tenders:view_all",
      "tenders:docs:view", "tenders:docs:upload", "tenders:docs:download", "tenders:docs:sign",
      "tenders:contract:view", "tenders:contract:create", "tenders:contract:edit", 
      "tenders:contract:sign", "tenders:contract:close"
    ],
    color: "#ec4899"
  },
  {
    name: "Наблюдатель тендеров",
    description: "Только просмотр тендеров и аналитики",
    permissions: [
      "tenders:view", "tenders:view_all",
      "tenders:calc:view",
      "tenders:docs:view", "tenders:docs:download",
      "tenders:review:view",
      "tenders:auction:view",
      "tenders:contract:view",
      "tenders:analytics:view"
    ],
    color: "#64748b"
  }
];

export default function RolesManager({ roles: initialRoles, companyId }: RolesManagerProps) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRecord[]>(initialRoles);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
    color: ROLE_COLORS[0],
    is_default: false,
    allowed_modes: null as string[] | null,
  });

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: [],
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      is_default: false,
      allowed_modes: null,
    });
    setShowModal(true);
  };

  const handleEdit = (role: RoleRecord) => {
    setEditingRole(role);
    // Фильтруем только те разрешения, которые есть в списке AVAILABLE_PERMISSIONS
    const availableIds = AVAILABLE_PERMISSIONS.map(p => p.id);
    const filteredPermissions = role.permissions.filter(p => availableIds.includes(p));
    setFormData({
      name: role.name,
      description: role.description,
      permissions: filteredPermissions,
      color: role.color,
      is_default: role.is_default,
      allowed_modes: role.allowed_modes || null,
    });
    setShowModal(true);
  };

  // Получить исходные права для системной роли
  const getDefaultPermissionsForSystemRole = (roleName: string): string[] | null => {
    const preset = ROLE_PRESETS.find(p => p.name === roleName);
    if (preset) return preset.permissions;
    
    // Для роли "Админ организации (Тендеры)" - все права тендеров
    if (roleName === "Админ организации (Тендеры)") {
      return AVAILABLE_PERMISSIONS.map(p => p.id);
    }
    
    return null;
  };

  const handleResetToDefault = () => {
    if (!editingRole) return;
    
    const defaultPermissions = getDefaultPermissionsForSystemRole(editingRole.name);
    if (defaultPermissions) {
      setFormData(prev => ({
        ...prev,
        permissions: defaultPermissions
      }));
    } else {
      alert("Не удалось найти исходные права для этой роли");
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Введите название роли");
      return;
    }

    if (formData.permissions.length === 0) {
      alert("Выберите хотя бы одно разрешение");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : "/api/roles";
      const method = editingRole ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          company_id: companyId, // Передаём company_id для привязки роли к компании
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save role");
      }

      const data = await res.json();
      
      if (editingRole) {
        setRoles(roles.map(r => r.id === editingRole.id ? data.role : r));
      } else {
        setRoles([...roles, data.role]);
      }

      setShowModal(false);
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при сохранении роли");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (role: RoleRecord) => {
    if (role.is_default) {
      alert("Нельзя удалить системную роль");
      return;
    }

    if (!confirm(`Удалить роль "${role.name}"?`)) return;

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete role");
      }

      setRoles(roles.filter(r => r.id !== role.id));
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при удалении роли");
    }
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const selectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
    }));
  };

  const deselectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const selectCategoryPermissions = (category: string) => {
    const categoryPerms = AVAILABLE_PERMISSIONS
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const allSelected = categoryPerms.every(p => formData.permissions.includes(p));
    
    if (allSelected) {
      // Снять все разрешения категории
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !categoryPerms.includes(p))
      }));
    } else {
      // Выбрать все разрешения категории
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPerms])]
      }));
    }
  };

  const groupPermissionsByCategory = () => {
    const grouped: Record<string, typeof AVAILABLE_PERMISSIONS> = {};
    AVAILABLE_PERMISSIONS.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped;
  };

  const permissionsByCategory = groupPermissionsByCategory();
  const availablePermissionIds = AVAILABLE_PERMISSIONS.map(p => p.id);
  const selectedAvailableCount = formData.permissions.filter(p => availablePermissionIds.includes(p)).length;
  const allPermissionsSelected = selectedAvailableCount === AVAILABLE_PERMISSIONS.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Управление ролями</h2><p className="text-sm text-muted-foreground">Создавайте роли и настраивайте права доступа</p></div><Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Создать роль</Button></div>

      <div className="space-y-3">
        {roles.map(role => { const isSystemRole = role.is_system || role.is_default; return (
          <Card key={role.id} className={isSystemRole ? 'border-muted' : ''}><CardContent className="pt-4"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color }} /><div><div className="font-medium flex items-center gap-2">{role.name}{isSystemRole && <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-1" />Системная</Badge>}</div><div className="text-sm text-muted-foreground">{role.description}</div></div></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleEdit(role)} title="Редактировать"><Pencil className="h-4 w-4" /></Button>{!isSystemRole && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(role)} title="Удалить"><Trash2 className="h-4 w-4" /></Button>}</div></div><div className="mt-3"><div className="text-xs text-muted-foreground mb-1">Разрешений: {role.permissions.length}</div><div className="flex flex-wrap gap-1">{role.permissions.slice(0, 5).map(perm => { const permission = AVAILABLE_PERMISSIONS.find(p => p.id === perm); return permission ? <Badge key={perm} variant="outline" className="text-xs">{permission.label}</Badge> : null; })}{role.permissions.length > 5 && <Badge variant="outline" className="text-xs">+{role.permissions.length - 5}</Badge>}</div></div></CardContent></Card>
        ); })}
        {roles.length === 0 && <div className="text-center py-12"><ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p>Нет созданных ролей</p><Button variant="outline" className="mt-2" onClick={handleCreate}>Создать первую роль</Button></div>}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingRole ? "Редактировать роль" : "Создать роль"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!editingRole && <div><Label className="flex items-center gap-1"><Sparkles className="h-4 w-4" />Шаблоны ролей</Label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">{ROLE_PRESETS.map((preset, idx) => <button key={idx} type="button" className="text-left p-3 border rounded-lg hover:bg-muted transition" onClick={() => setFormData({ name: preset.name, description: preset.description, permissions: preset.permissions, color: preset.color, is_default: false, allowed_modes: null })}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.color }} /><span className="font-medium text-sm">{preset.name}</span></div><p className="text-xs text-muted-foreground mt-1">{preset.permissions.length} прав</p></button>)}</div></div>}
          <div className="space-y-1"><Label>Название *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Менеджер, Бухгалтер" /></div>
          <div className="space-y-1"><Label>Описание</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Краткое описание роли" rows={2} /></div>
          <div className="space-y-1"><Label>Цвет</Label><div className="flex gap-2 flex-wrap">{ROLE_COLORS.map(c => <button key={c} type="button" className={`w-6 h-6 rounded-full border-2 ${formData.color === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setFormData({ ...formData, color: c })} />)}</div></div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded"><Gavel className="h-4 w-4" />Все роли относятся к режиму <strong>Тендеры</strong></div>
          <div><div className="flex items-center justify-between mb-2"><Label>Разрешения *</Label><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={allPermissionsSelected ? deselectAllPermissions : selectAllPermissions}>{allPermissionsSelected ? <><Square className="h-4 w-4 mr-1" />Снять все</> : <><CheckSquare className="h-4 w-4 mr-1" />Выбрать все</>}</Button><span className="text-xs text-muted-foreground">{selectedAvailableCount}/{AVAILABLE_PERMISSIONS.length}</span></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">{Object.entries(permissionsByCategory).map(([category, perms]) => { const categoryPerms = perms.map(p => p.id); const allCategorySelected = categoryPerms.every(p => formData.permissions.includes(p)); return (<div key={category} className="border rounded p-2"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">{category}</span><button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => selectCategoryPermissions(category)}>{allCategorySelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}</button></div>{perms.map(perm => <label key={perm.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer"><Checkbox checked={formData.permissions.includes(perm.id)} onCheckedChange={() => togglePermission(perm.id)} />{perm.label}</label>)}</div>); })}</div></div>
        </div>
        <DialogFooter className="flex justify-between"><div>{editingRole && (editingRole.is_system || editingRole.is_default) && <Button variant="outline" onClick={handleResetToDefault} disabled={isSaving}><RotateCcw className="h-4 w-4 mr-1" />Сбросить права</Button>}</div><div className="flex gap-2"><Button variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>Отмена</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : editingRole ? 'Сохранить' : 'Создать'}</Button></div></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
