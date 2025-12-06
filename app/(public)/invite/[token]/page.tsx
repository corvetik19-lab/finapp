'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface InvitationInfo {
  id: string;
  email: string;
  position: string | null;
  department: string | null;
  company: {
    id: string;
    name: string;
  };
  role: {
    id: string;
    name: string;
    color: string;
  } | null;
  expires_at: string;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  });

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const response = await fetch(`/api/employees/invitations/accept?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Ошибка загрузки приглашения');
          return;
        }

        setInvitation(data);
      } catch (err) {
        console.error('Error loading invitation:', err);
        setError('Ошибка загрузки приглашения');
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name.trim()) {
      setError('Введите ваше имя');
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch('/api/employees/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          full_name: formData.full_name,
          phone: formData.phone || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка принятия приглашения');
        return;
      }

      // Перенаправляем в личный кабинет
      router.push('/tenders');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Ошибка принятия приглашения');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <div className="bg-card rounded-xl border p-8 max-w-md w-full text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Загрузка приглашения...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <div className="bg-card rounded-xl border p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">Ошибка</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a href="/login" className="text-primary hover:underline">
            Войти в систему
          </a>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="bg-card rounded-xl border p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <span className="text-4xl">🎉</span>
          <h1 className="text-2xl font-bold mt-2">Приглашение в команду</h1>
        </div>

        <div className="text-center mb-6">
          <p className="text-muted-foreground">Вас приглашают присоединиться к компании</p>
          <h2 className="text-xl font-semibold text-primary">{invitation.company.name}</h2>
        </div>

        <div className="space-y-2 mb-6 bg-muted rounded-lg p-4">
          {invitation.position && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Должность:</span>
              <span className="font-medium">{invitation.position}</span>
            </div>
          )}
          {invitation.department && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Отдел:</span>
              <span className="font-medium">{invitation.department}</span>
            </div>
          )}
          {invitation.role && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Роль:</span>
              <span 
                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ background: invitation.role.color }}
              >
                {invitation.role.name}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Ваше имя *</label>
            <Input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Телефон</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <Button type="submit" disabled={accepting} className="w-full">
            {accepting ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Принятие...</>
            ) : (
              '✅ Принять приглашение'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Приглашение действительно до {new Date(invitation.expires_at).toLocaleDateString('ru-RU')}
        </p>
      </div>
    </div>
  );
}
