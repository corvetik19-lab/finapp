'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface StageData { name: string; category: string; color: string; is_active: boolean; }

interface StageModalProps {
  stage?: Partial<StageData> & { id?: string };
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: StageData) => Promise<void>;
}

export function StageModal({ stage, isOpen, onClose, onSave }: StageModalProps) {
  const [formData, setFormData] = useState({ name: '', category: 'tender_dept', color: '#3b82f6', is_active: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stage) { setFormData({ name: stage.name || '', category: stage.category || 'tender_dept', color: stage.color || '#3b82f6', is_active: stage.is_active !== undefined ? stage.is_active : true }); }
    else { setFormData({ name: '', category: 'tender_dept', color: '#3b82f6', is_active: true }); }
    setError('');
  }, [stage, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Название этапа обязательно'); return; }
    setLoading(true);
    try { await onSave(formData); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Ошибка при сохранении'); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stage ? 'Редактировать этап' : 'Создать этап'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label>Название этапа <span className="text-red-500">*</span></Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Например: Проверка документов" required />
          </div>
          <div className="space-y-2">
            <Label>Категория</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tender_dept">Предконтрактная работа</SelectItem>
                <SelectItem value="realization">Реализация</SelectItem>
                <SelectItem value="archive">Архивные</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Цвет</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer border" />
              <span className="text-sm text-gray-500">{formData.color}</span>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })} />
            <div className="grid gap-1.5 leading-none">
              <label htmlFor="is_active" className="text-sm font-medium leading-none cursor-pointer">Этап активен</label>
              <p className="text-xs text-gray-500">Неактивные этапы не отображаются в канбан-доске</p>
            </div>
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
