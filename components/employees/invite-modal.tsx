'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Mail, Send, Loader2 } from 'lucide-react';

interface CompanyRole {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
}

export function InviteModal({ isOpen, onClose, companyId }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Загрузка ролей
  useEffect(() => {
    if (!isOpen || !companyId) return;

    const loadRoles = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/roles?company_id=${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setRoles(data.roles || []);
        }
      } catch (err) {
        console.error('Error loading roles:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [isOpen, companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Введите email');
      return;
    }

    if (!roleId) {
      setError('Выберите роль');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role_id: roleId,
          company_id: companyId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка отправки приглашения');
      }

      setSuccess(true);
      setTimeout(() => {
        setEmail('');
        setRoleId('');
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRoleId('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Mail className="h-5 w-5" />
            Пригласить сотрудника
          </DialogTitle>
          <DialogDescription>
            Отправьте приглашение на email для регистрации в системе
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Приглашение отправлено!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Письмо с инструкциями отправлено на {email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-foreground"
                />
              </div>

              {/* Роль */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-foreground">Роль</Label>
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка ролей...
                  </div>
                ) : (
                  <Select value={roleId} onValueChange={setRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите роль" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: role.color }}
                            />
                            <span>{role.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {roleId && roles.find((r) => r.id === roleId)?.description && (
                  <p className="text-xs text-muted-foreground">
                    {roles.find((r) => r.id === roleId)?.description}
                  </p>
                )}
              </div>

              {/* Ошибка */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Отправить
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
