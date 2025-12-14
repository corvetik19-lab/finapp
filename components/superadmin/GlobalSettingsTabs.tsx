"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  Building2, 
  Users, 
  Shield, 
  Puzzle, 
  Key, 
  Database,
  Plus,
  CheckCircle,
  XCircle,
  ChevronRight
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GlobalModesManager } from "./GlobalModesManager";
import { GlobalRolesManager } from "./GlobalRolesManager";
import { OrganizationsList } from "@/components/admin/organizations-list";
import { CreateOrganizationModal } from "@/components/admin/create-organization-modal";
import type { AppModeKey } from "@/lib/platform/modes-config";
import type { Organization } from "@/lib/auth/types";
import type { UserWithOrganizations } from "@/lib/admin/users";

interface ModeInfo {
  key: string;
  label: string;
  icon: string;
  description: string;
}

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

interface GlobalSettingsTabsProps {
  enabledModes: AppModeKey[];
  allModes: readonly ModeInfo[];
  organizations: Organization[];
  users: UserWithOrganizations[];
  roles?: RoleConfig[];
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Супер-админ",
  admin: "Админ",
  manager: "Менеджер",
  accountant: "Бухгалтер",
  supplier_manager: "Менеджер поставщиков",
  specialist: "Специалист",
  viewer: "Наблюдатель",
};

export function GlobalSettingsTabs({ 
  enabledModes, 
  allModes, 
  organizations, 
  users,
  roles = []
}: GlobalSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState("modes");

  // Статистика организаций
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.is_active).length;
  const suspendedOrgs = totalOrgs - activeOrgs;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 h-auto p-1">
        <TabsTrigger value="modes" className="flex items-center gap-2 py-2">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Режимы</span>
        </TabsTrigger>
        <TabsTrigger value="organizations" className="flex items-center gap-2 py-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">Организации</span>
          <Badge variant="secondary" className="ml-1">{totalOrgs}</Badge>
        </TabsTrigger>
        <TabsTrigger value="users" className="flex items-center gap-2 py-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Пользователи</span>
          <Badge variant="secondary" className="ml-1">{users.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex items-center gap-2 py-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Роли</span>
        </TabsTrigger>
        <TabsTrigger value="integrations" className="flex items-center gap-2 py-2">
          <Puzzle className="h-4 w-4" />
          <span className="hidden sm:inline">Интеграции</span>
        </TabsTrigger>
        <TabsTrigger value="system" className="flex items-center gap-2 py-2">
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline">Система</span>
        </TabsTrigger>
      </TabsList>

      {/* Режимы платформы */}
      <TabsContent value="modes">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Режимы платформы
            </CardTitle>
            <CardDescription>
              Управление доступными режимами приложения. Отключённые режимы не будут отображаться 
              в списке выбора режима для всех пользователей. Минимум один режим должен быть включён.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GlobalModesManager 
              allModes={allModes} 
              enabledModes={enabledModes} 
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Организации */}
      <TabsContent value="organizations">
        <div className="space-y-4">
          {/* Заголовок и действия */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Управление организациями</h2>
              <p className="text-sm text-muted-foreground">Клиенты и их доступ к модулям</p>
            </div>
            <CreateOrganizationModal users={users} />
          </div>

          {/* Карточки статистики */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Всего организаций</div>
                <div className="text-2xl font-bold">{totalOrgs}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-4">
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Активные
                </div>
                <div className="text-2xl font-bold text-green-600">{activeOrgs}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-4">
                <div className="text-sm text-amber-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Остановленные
                </div>
                <div className="text-2xl font-bold text-amber-600">{suspendedOrgs}</div>
              </CardContent>
            </Card>
          </div>

          {/* Список организаций */}
          <Card>
            <CardContent className="p-0">
              <OrganizationsList
                organizations={organizations}
                isSuperAdmin={true}
                activeOrgId={null}
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Пользователи */}
      <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Пользователи платформы
            </CardTitle>
            <CardDescription>
              Все зарегистрированные пользователи с их организациями
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Группировка по организациям */}
            {(() => {
              // Группируем пользователей по организациям
              const orgUsers = new Map<string, { org: { id: string; name: string }; users: typeof users }>();
              const noOrgUsers: typeof users = [];

              users.forEach(user => {
                if (user.organizations.length === 0) {
                  noOrgUsers.push(user);
                } else {
                  user.organizations.forEach(org => {
                    if (!orgUsers.has(org.id)) {
                      orgUsers.set(org.id, { org, users: [] });
                    }
                    orgUsers.get(org.id)!.users.push(user);
                  });
                }
              });

              return (
                <>
                  {/* Пользователи по организациям */}
                  {Array.from(orgUsers.values()).map(({ org, users: orgMembers }) => (
                    <Collapsible key={org.id} defaultOpen={false} className="space-y-2">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors group">
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        <Building2 className="h-5 w-5 text-blue-500" />
                        <h3 className="font-semibold text-base">{org.name}</h3>
                        <Badge variant="outline" className="ml-2">{orgMembers.length}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="rounded-lg border ml-6">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Пользователь</th>
                                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Роль в орг.</th>
                                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Глобальная роль</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orgMembers.map((user) => {
                                const userOrgRole = user.organizations.find(o => o.id === org.id)?.role;
                                return (
                                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="py-2 px-4">
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium">{user.full_name || "Без имени"}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-4">
                                      <Badge variant="outline" className="text-xs">
                                        {ROLE_LABELS[userOrgRole || ""] || userOrgRole || "—"}
                                      </Badge>
                                    </td>
                                    <td className="py-2 px-4">
                                      {user.global_role === "super_admin" ? (
                                        <Badge className="bg-purple-500 text-xs">
                                          👑 Супер-админ
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">
                                          {user.global_role || "user"}
                                        </Badge>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}

                  {/* Пользователи без организации */}
                  {noOrgUsers.length > 0 && (
                    <Collapsible defaultOpen={false} className="space-y-2">
                      <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors group">
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        <Users className="h-5 w-5 text-gray-400" />
                        <h3 className="font-semibold text-base text-muted-foreground">Без организации</h3>
                        <Badge variant="outline" className="ml-2">{noOrgUsers.length}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="rounded-lg border ml-6 border-dashed">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Пользователь</th>
                                <th className="text-left py-2 px-4 text-xs font-semibold text-muted-foreground uppercase">Глобальная роль</th>
                              </tr>
                            </thead>
                            <tbody>
                              {noOrgUsers.map((user) => (
                                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="py-2 px-4">
                                    <div className="flex flex-col">
                                      <span className="text-sm font-medium">{user.full_name || "Без имени"}</span>
                                      <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-4">
                                    {user.global_role === "super_admin" ? (
                                      <Badge className="bg-purple-500 text-xs">
                                        👑 Супер-админ
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        {user.global_role || "user"}
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Роли и права */}
      <TabsContent value="roles">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Роли и права доступа
            </CardTitle>
            <CardDescription>
              Управление ролями и доступом к модулям платформы
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GlobalRolesManager roles={roles} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Интеграции */}
      <TabsContent value="integrations">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5" />
              Интеграции
            </CardTitle>
            <CardDescription>
              Подключённые сервисы и API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: "Telegram Bot", description: "Уведомления и команды", connected: true },
                { name: "OpenAI", description: "AI-анализ и категоризация", connected: true },
                { name: "ЕИС (zakupki.gov.ru)", description: "Импорт тендеров", connected: false },
                { name: "1С", description: "Синхронизация данных", connected: false },
              ].map((integration) => (
                <div key={integration.name} className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <div className="font-medium">{integration.name}</div>
                    <div className="text-sm text-muted-foreground">{integration.description}</div>
                  </div>
                  <Badge variant={integration.connected ? "default" : "secondary"}>
                    {integration.connected ? "Подключено" : "Не подключено"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Система */}
      <TabsContent value="system">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Резервные копии
              </CardTitle>
              <CardDescription>
                Управление бэкапами базы данных
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Database className="h-4 w-4 mr-2" />
                Создать резервную копию
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API ключи
              </CardTitle>
              <CardDescription>
                Управление ключами доступа к API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Создать новый ключ
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
