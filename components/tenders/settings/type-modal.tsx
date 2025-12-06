'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface TypeData { name: string; description: string; }

interface TypeModalProps {
  type?: Partial<TypeData> & { id?: string; is_system?: boolean };
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TypeData) => Promise<void>;
}

export function TypeModal({ type, isOpen, onClose, onSave }: TypeModalProps) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (type) { setFormData({ name: type.name || '', description: type.description || '' }); }
    else { setFormData({ name: '', description: '' }); }
    setError('');
  }, [type, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Название типа обязательно'); return; }
    setLoading(true);
    try { await onSave(formData); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Ошибка при сохранении'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{type ? 'Редактировать тип' : 'Создать тип'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label>Название типа <span className="text-red-500">*</span>
              {type?.is_system && <span className="ml-2 text-xs text-gray-500">(системный тип)</span>}
            </Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Например: Электронный аукцион" required readOnly={type?.is_system} disabled={type?.is_system} className={type?.is_system ? 'bg-gray-100 cursor-not-allowed' : ''} />
            {type?.is_system && <p className="text-xs text-gray-500">Название системного типа нельзя изменить</p>}
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Краткое описание типа тендера" rows={4} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Отмена</Button>
            <Button type="submit" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Сохранение...</> : 'Сохранить'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
