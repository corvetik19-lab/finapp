'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Mail, Copy, X, Loader2, Inbox } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  position: string | null;
  department: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  role?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface InvitationsListProps {
  companyId: string;
  onInvite?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: '#f59e0b' },
  accepted: { label: 'Принято', color: '#22c55e' },
  expired: { label: 'Истекло', color: '#94a3b8' },
  cancelled: { label: 'Отменено', color: '#ef4444' }
};

export function InvitationsList({ companyId, onInvite }: InvitationsListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/invitations?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (err) {
      console.error('Error loading invitations:', err);
      setError('Ошибка загрузки приглашений');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Отменить приглашение?')) return;

    try {
      const response = await fetch(`/api/employees/invitations?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setInvitations(invitations.map(inv => 
          inv.id === id ? { ...inv, status: 'cancelled' as const } : inv
        ));
      }
    } catch (err) {
      console.error('Error cancelling invitation:', err);
      setError('Ошибка отмены приглашения');
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    alert('Ссылка скопирована!');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка приглашений...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h4 className="font-semibold flex items-center gap-2"><Mail className="h-5 w-5" />Приглашения</h4>{onInvite && <Button onClick={onInvite} size="sm"><Plus className="h-4 w-4 mr-1" />Пригласить</Button>}</div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {invitations.length === 0 ? <div className="text-center py-8"><Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Нет приглашений</p></div> : <div className="space-y-2">{invitations.map(inv => <Card key={inv.id}><CardContent className="pt-3 flex items-center gap-3"><div className="flex-1"><div className="font-medium">{inv.email}</div><div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">{inv.position && <span>{inv.position}</span>}{inv.department && <span>{inv.department}</span>}{inv.role && <Badge style={{ background: inv.role.color }}>{inv.role.name}</Badge>}</div><div className="text-xs text-muted-foreground mt-1">Создано: {new Date(inv.created_at).toLocaleDateString('ru-RU')}{inv.status === 'pending' && <> • Истекает: {new Date(inv.expires_at).toLocaleDateString('ru-RU')}</>}</div></div><div className="flex items-center gap-1"><Badge style={{ background: STATUS_LABELS[inv.status].color }}>{STATUS_LABELS[inv.status].label}</Badge>{inv.status === 'pending' && <><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyInviteLink((inv as Invitation & { token?: string }).token || inv.id)} title="Копировать"><Copy className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCancel(inv.id)} title="Отменить"><X className="h-4 w-4" /></Button></>}</div></CardContent></Card>)}</div>}
    </div>
  );
}
