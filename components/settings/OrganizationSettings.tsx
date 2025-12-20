"use client";

import { useState } from "react";
import Image from "next/image";
import type { Organization } from "@/lib/organizations/types";
import { deleteOrganization } from "@/lib/admin/organizations";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Users, Calendar, Fingerprint, LayoutGrid, AlertTriangle, Trash2, CheckCircle2, Loader2, Mail, Shield } from "lucide-react";

interface Member {
  id: string;
  role: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  plans: {
    id: string;
    name: string;
    price: number;
    billing_period: string;
    features: string[] | null;
  } | null;
}

interface OrganizationSettingsProps {
  organization: Organization;
  members?: Member[];
  subscription?: Subscription | null;
  stats?: {
    transactions: number;
    accounts: number;
    categories: number;
  };
  isAdmin?: boolean;
  currentUserId?: string;
}

export default function OrganizationSettings({ 
  organization, 
  members = [], 
  isAdmin = false,
  currentUserId
}: OrganizationSettingsProps) {
  const router = useRouter();
  const [name, setName] = useState(organization.name);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organization/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Ошибка обновления организации");
      }

      setMessage({ type: "success", text: "Организация успешно обновлена" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Произошла ошибка" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить эту организацию? Это действие необратимо и удалит ВСЕ данные.")) {
      return;
    }

    // Второе подтверждение для надежности
    if (!confirm("Подтвердите удаление. Организация будет удалена навсегда.")) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteOrganization(organization.id);
      router.push("/admin/organizations");
    } catch (error) {
      console.error("Error deleting organization:", error);
      alert("Ошибка при удалении организации: " + (error instanceof Error ? error.message : String(error)));
      setIsLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    const lowerRole = role.toLowerCase();
    // Админы - синий/фиолетовый
    if (lowerRole.includes('админ') || lowerRole.includes('admin') || lowerRole === 'owner' || lowerRole.includes('владелец')) {
      return { bg: '#3b82f6', light: '#dbeafe', text: '#1e40af' };
    }
    // ИИ специалисты - фиолетовый
    if (lowerRole.includes('ии') || lowerRole.includes('ai')) {
      return { bg: '#8b5cf6', light: '#ede9fe', text: '#5b21b6' };
    }
    // Просчётчики - зелёный
    if (lowerRole.includes('просчёт') || lowerRole.includes('просчет')) {
      return { bg: '#10b981', light: '#d1fae5', text: '#065f46' };
    }
    // Менеджеры - оранжевый
    if (lowerRole.includes('менеджер') || lowerRole.includes('manager')) {
      return { bg: '#f59e0b', light: '#fef3c7', text: '#92400e' };
    }
    // Бухгалтеры - голубой
    if (lowerRole.includes('бухгалтер') || lowerRole.includes('accountant')) {
      return { bg: '#06b6d4', light: '#cffafe', text: '#155e75' };
    }
    // Специалисты - жёлтый
    if (lowerRole.includes('специалист') || lowerRole.includes('specialist')) {
      return { bg: '#eab308', light: '#fef9c3', text: '#713f12' };
    }
    // Наблюдатели - серый
    if (lowerRole.includes('наблюдатель') || lowerRole.includes('viewer')) {
      return { bg: '#64748b', light: '#f1f5f9', text: '#334155' };
    }
    // По умолчанию - серый
    return { bg: '#64748b', light: '#f1f5f9', text: '#334155' };
  };

  const isAdminRole = (role: string) => {
    const lowerRole = role.toLowerCase();
    return lowerRole.includes('админ') || lowerRole.includes('admin') || 
           lowerRole === 'owner' || lowerRole.includes('владелец') ||
           lowerRole.includes('полный доступ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" />Информация об организации</h1>
        <div className="text-sm text-muted-foreground">Просмотр и управление данными</div>
      </div>

      {/* Основная информация */}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Основная информация</CardTitle></CardHeader><CardContent>
        {isAdmin ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1"><Label>Название организации</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
            {message && <Alert className={message.type === 'success' ? 'border-green-500' : 'border-destructive'}>{message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4" />}<AlertDescription>{message.text}</AlertDescription></Alert>}
            <Button type="submit" disabled={isLoading}>{isLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : 'Сохранить изменения'}</Button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Название</div>
                <div className="font-medium">{organization.name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Статус</div>
                <Badge variant={organization.is_active ? "default" : "secondary"}>
                  {organization.is_active ? "Активна" : "Неактивна"}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent></Card>

      {/* Участники */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Участники ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Нет участников</p>
              <p className="text-sm">Пригласите коллег в организацию</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Сначала админы */}
              {members.filter(m => isAdminRole(m.role)).map(member => {
                const colors = getRoleColor(member.role);
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      member.profiles?.id === currentUserId 
                        ? 'ring-2 ring-offset-2 ring-primary border-primary/30 bg-primary/5' 
                        : 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${colors.bg}, ${colors.bg}dd)` }}
                    >
                      {member.profiles?.avatar_url ? (
                        <Image src={member.profiles.avatar_url} alt="" fill className="rounded-full object-cover" />
                      ) : (
                        (member.profiles?.full_name || member.profiles?.email || '?')[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base flex items-center gap-2 flex-wrap">
                        <span className="truncate">{member.profiles?.full_name || 'Без имени'}</span>
                        {member.profiles?.id === currentUserId && (
                          <Badge variant="secondary" className="text-xs font-medium">Вы</Badge>
                        )}
                        <Shield className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{member.profiles?.email || '—'}</span>
                      </div>
                    </div>
                    <Badge 
                      className="font-semibold px-3 py-1 shadow-sm"
                      style={{ 
                        background: colors.light, 
                        color: colors.text,
                        border: `1px solid ${colors.bg}40`
                      }}
                    >
                      {member.role}
                    </Badge>
                  </div>
                );
              })}
              
              {/* Затем обычные участники */}
              {members.filter(m => !isAdminRole(m.role)).map(member => {
                const colors = getRoleColor(member.role);
                return (
                  <div
                    key={member.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm hover:border-gray-300 ${
                      member.profiles?.id === currentUserId 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-gray-50/50 border-gray-100'
                    }`}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow"
                      style={{ background: `linear-gradient(135deg, ${colors.bg}cc, ${colors.bg})` }}
                    >
                      {member.profiles?.avatar_url ? (
                        <Image src={member.profiles.avatar_url} alt="" fill className="rounded-full object-cover" />
                      ) : (
                        (member.profiles?.full_name || member.profiles?.email || '?')[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        <span className="truncate">{member.profiles?.full_name || 'Без имени'}</span>
                        {member.profiles?.id === currentUserId && (
                          <Badge variant="secondary" className="text-xs">Вы</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{member.profiles?.email || '—'}</div>
                    </div>
                    <Badge 
                      className="font-medium text-xs px-2.5 py-0.5"
                      style={{ 
                        background: colors.light, 
                        color: colors.text,
                        border: `1px solid ${colors.bg}30`
                      }}
                    >
                      {member.role}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Доп. информация */}
      <Card><CardHeader><CardTitle>Дополнительно</CardTitle></CardHeader><CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Дата создания</div>
              <div className="font-medium">{new Date(organization.created_at).toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Fingerprint className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">ID</div>
              <div className="text-xs font-mono">{organization.id}</div>
            </div>
          </div>
          {organization.allowed_modes && organization.allowed_modes.length > 0 && (
            <div className="flex items-center gap-3">
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Режимы</div>
                <div className="font-medium">{organization.allowed_modes.join(', ')}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent></Card>

      {/* Опасная зона */}
      {isAdmin && <Card className="border-destructive"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Опасная зона</CardTitle><CardDescription>Это действие необратимо</CardDescription></CardHeader><CardContent className="flex items-center justify-between"><div><h3 className="font-medium">Удалить организацию</h3><p className="text-sm text-muted-foreground">Все данные будут удалены навсегда</p></div><Button variant="destructive" onClick={handleDelete} disabled={isLoading}><Trash2 className="h-4 w-4 mr-1" />{isLoading ? 'Удаление...' : 'Удалить'}</Button></CardContent></Card>}
    </div>
  );
}
