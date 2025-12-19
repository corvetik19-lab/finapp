"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/toast/ToastContext";
import { Loader2, Save, Shield, Users, Briefcase, Receipt, Factory, Eye, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleConfig {
  id: string;
  role_key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  allowed_modules: string[];
  sort_order: number;
  is_active: boolean;
}

const MODULE_INFO: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  tenders: { name: "Тендеры", icon: <Briefcase className="h-3 w-3" />, color: "#F59E0B" },
  suppliers: { name: "Поставщики", icon: <Factory className="h-3 w-3" />, color: "#3B82F6" },
  accounting: { name: "Бухгалтерия", icon: <Receipt className="h-3 w-3" />, color: "#10B981" },
  finance: { name: "Финансы", icon: <Settings className="h-3 w-3" />, color: "#8B5CF6" },
  personal: { name: "Личные", icon: <Users className="h-3 w-3" />, color: "#EC4899" },
  investments: { name: "Инвестиции", icon: <Settings className="h-3 w-3" />, color: "#06B6D4" },
  "ai-studio": { name: "ИИ Студия", icon: <Eye className="h-3 w-3" />, color: "#A855F7" },
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  super_admin: <Shield className="h-5 w-5" />,
  admin: <Settings className="h-5 w-5" />,
  manager: <Briefcase className="h-5 w-5" />,
  accountant: <Receipt className="h-5 w-5" />,
  supplier_manager: <Factory className="h-5 w-5" />,
  specialist: <Users className="h-5 w-5" />,
  viewer: <Eye className="h-5 w-5" />,
  financial_analyst: <Receipt className="h-5 w-5" />,
  treasurer: <Receipt className="h-5 w-5" />,
  hr_manager: <Users className="h-5 w-5" />,
  department_head: <Shield className="h-5 w-5" />,
  project_manager: <Briefcase className="h-5 w-5" />,
  analyst: <Eye className="h-5 w-5" />,
  operator: <Settings className="h-5 w-5" />,
  secretary: <Users className="h-5 w-5" />,
  external_auditor: <Eye className="h-5 w-5" />,
  consultant: <Briefcase className="h-5 w-5" />,
  ai_specialist: <Eye className="h-5 w-5" />,
  finance_only: <Receipt className="h-5 w-5" />,
  tenders_only: <Briefcase className="h-5 w-5" />,
  investments_only: <Settings className="h-5 w-5" />,
  personal_only: <Users className="h-5 w-5" />,
  tender_calculator: <Receipt className="h-5 w-5" />,
  tender_manager: <Briefcase className="h-5 w-5" />,
  tender_specialist: <Users className="h-5 w-5" />,
  contract_manager: <Receipt className="h-5 w-5" />,
  tender_reviewer: <Eye className="h-5 w-5" />,
  tender_observer: <Eye className="h-5 w-5" />,
  chief_accountant: <Receipt className="h-5 w-5" />,
  accountant_payroll: <Receipt className="h-5 w-5" />,
  accountant_primary: <Receipt className="h-5 w-5" />,
  cfo: <Shield className="h-5 w-5" />,
  budget_controller: <Receipt className="h-5 w-5" />,
  procurement_manager: <Factory className="h-5 w-5" />,
  supply_specialist: <Factory className="h-5 w-5" />,
  ceo: <Shield className="h-5 w-5" />,
  deputy_director: <Shield className="h-5 w-5" />,
  it_admin: <Settings className="h-5 w-5" />,
  security_officer: <Shield className="h-5 w-5" />,
};

interface GlobalRolesManagerProps {
  roles: RoleConfig[];
}

export function GlobalRolesManager({ roles: initialRoles }: GlobalRolesManagerProps) {
  const [roles, setRoles] = useState<RoleConfig[]>(initialRoles);
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();
  const { show: showToast } = useToast();

  const toggleModule = (roleKey: string, module: string) => {
    setRoles(prev => prev.map(role => {
      if (role.role_key !== roleKey) return role;
      
      const hasModule = role.allowed_modules.includes(module);
      const newModules = hasModule
        ? role.allowed_modules.filter(m => m !== module)
        : [...role.allowed_modules, module];
      
      return { ...role, allowed_modules: newModules };
    }));
    setHasChanges(true);
  };

  const toggleRoleActive = (roleKey: string) => {
    // Нельзя деактивировать super_admin и admin
    if (roleKey === 'super_admin' || roleKey === 'admin') {
      showToast("Нельзя деактивировать системные роли", { type: "error" });
      return;
    }
    
    setRoles(prev => prev.map(role => {
      if (role.role_key !== roleKey) return role;
      return { ...role, is_active: !role.is_active };
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roles }),
        });
        
        if (response.ok) {
          showToast("Настройки ролей сохранены", { type: "success" });
          setHasChanges(false);
          router.refresh();
        } else {
          throw new Error('Failed to save');
        }
      } catch {
        showToast("Ошибка сохранения", { type: "error" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Роли и доступ к модулям</h3>
          <p className="text-sm text-muted-foreground">
            Настройте какие модули доступны для каждой роли
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Сохранить
          </Button>
        )}
      </div>

      {/* Список ролей */}
      <div className="grid gap-4">
        {roles
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((role) => {
            const isSystemRole = role.role_key === 'super_admin' || role.role_key === 'admin';
            const hasAllAccess = role.allowed_modules.includes('*');

            return (
              <Card 
                key={role.id}
                className={cn(
                  "transition-all",
                  !role.is_active && "opacity-50"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: role.color }}
                      >
                        {ROLE_ICONS[role.role_key] || <Users className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <span>{role.icon}</span>
                          {role.name}
                          {isSystemRole && (
                            <Badge variant="secondary" className="text-xs">
                              Системная
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {role.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isSystemRole && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {role.is_active ? "Активна" : "Неактивна"}
                          </span>
                          <Switch
                            checked={role.is_active}
                            onCheckedChange={() => toggleRoleActive(role.role_key)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {hasAllAccess ? (
                      <Badge 
                        variant="default"
                        className="bg-gradient-to-r from-purple-500 to-pink-500"
                      >
                        ✨ Полный доступ ко всем модулям
                      </Badge>
                    ) : (
                      Object.entries(MODULE_INFO).map(([moduleKey, moduleInfo]) => {
                        const hasAccess = role.allowed_modules.includes(moduleKey);
                        const canEdit = !isSystemRole && role.is_active;
                        
                        return (
                          <button
                            key={moduleKey}
                            onClick={() => canEdit && toggleModule(role.role_key, moduleKey)}
                            disabled={!canEdit}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                              hasAccess
                                ? "bg-opacity-20 border-2"
                                : "bg-gray-100 text-gray-400 border-2 border-transparent",
                              canEdit && "hover:scale-105 cursor-pointer",
                              !canEdit && "cursor-default"
                            )}
                            style={{
                              backgroundColor: hasAccess ? `${moduleInfo.color}20` : undefined,
                              borderColor: hasAccess ? moduleInfo.color : undefined,
                              color: hasAccess ? moduleInfo.color : undefined,
                            }}
                          >
                            {moduleInfo.icon}
                            {moduleInfo.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Подсказка */}
      <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
        <p className="font-medium mb-1">💡 Как это работает:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>Супер-администратор</strong> — полный доступ ко всей платформе</li>
          <li><strong>Администратор</strong> — полный доступ к организации</li>
          <li><strong>Бухгалтер</strong> — доступ только к модулю Бухгалтерия</li>
          <li><strong>Менеджер поставщиков</strong> — доступ только к модулю Поставщики</li>
          <li>Нажмите на модуль чтобы включить/выключить доступ для роли</li>
        </ul>
      </div>
    </div>
  );
}
