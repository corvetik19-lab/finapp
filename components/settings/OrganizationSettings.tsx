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
import { Building2, Users, Calendar, Fingerprint, LayoutGrid, AlertTriangle, Trash2, CheckCircle2, Link2, Loader2 } from "lucide-react";

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
  const [slug, setSlug] = useState(organization.slug || '');
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
        body: JSON.stringify({ name, slug }),
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

  const getRoleName = (role: string) => {
    switch (role) {
      case 'owner': return 'Владелец';
      case 'admin': return 'Администратор';
      case 'member': return 'Участник';
      case 'viewer': return 'Наблюдатель';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#8b5cf6';
      case 'admin': return '#3b82f6';
      case 'member': return '#22c55e';
      case 'viewer': return '#64748b';
      default: return '#64748b';
    }
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
            <div className="space-y-1"><Label>Slug (URL идентификатор)</Label><Input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} pattern="[a-z0-9-]+" required /><p className="text-xs text-muted-foreground">Только строчные буквы, цифры и дефисы</p></div>
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
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Slug</div>
                <div className="font-medium">{organization.slug || '—'}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent></Card>

      {/* Участники */}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Участники ({members.length})</CardTitle></CardHeader><CardContent>
        <div className="space-y-2">
          {members.map(member => (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-2 rounded ${member.profiles?.id === currentUserId ? 'bg-muted' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {member.profiles?.avatar_url ? (
                  <Image src={member.profiles.avatar_url} alt="" fill className="rounded-full object-cover" />
                ) : (
                  (member.profiles?.full_name || member.profiles?.email || '?')[0].toUpperCase()
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  <span>{member.profiles?.full_name || 'Без имени'}</span>
                  {member.profiles?.id === currentUserId && (
                    <Badge variant="outline" className="text-xs inline-flex items-center">
                      Вы
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{member.profiles?.email || '—'}</div>
              </div>
              <Badge style={{ background: `${getRoleColor(member.role)}20`, color: getRoleColor(member.role) }}>
                {getRoleName(member.role)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent></Card>

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
