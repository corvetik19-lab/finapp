'use client';

import { useState, useEffect } from 'react';
import { TenderStage } from '@/lib/tenders/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

interface TemplateData { name: string; description: string; icon: string; is_active: boolean; stage_ids: string[]; }

interface TemplateModalProps {
  template?: Partial<TemplateData> & { id?: string; items?: { stage_id: string }[]; is_system?: boolean };
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TemplateData) => Promise<void>;
  stages: TenderStage[];
}

export function TemplateModal({ template, isOpen, onClose, onSave, stages }: TemplateModalProps) {
  const [formData, setFormData] = useState<TemplateData>({ name: '', description: '', icon: '📋', is_active: true, stage_ids: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Группируем этапы по категориям
  const tenderDeptStages = stages.filter(s => s.category === 'tender_dept');
  const realizationStages = stages.filter(s => s.category === 'realization');
  const archiveStages = stages.filter(s => s.category === 'archive');

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        icon: template.icon || '📋',
        is_active: template.is_active !== undefined ? template.is_active : true,
        stage_ids: template.items?.map(item => item.stage_id) || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        icon: '📋',
        is_active: true,
        stage_ids: [],
      });
    }
    setError('');
  }, [template, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Название шаблона обязательно');
      return;
    }

    if (formData.stage_ids.length === 0) {
      setError('Выберите хотя бы один этап');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = (stageId: string) => {
    setFormData(prev => ({
      ...prev,
      stage_ids: prev.stage_ids.includes(stageId)
        ? prev.stage_ids.filter(id => id !== stageId)
        : [...prev.stage_ids, stageId]
    }));
  };

  const moveStageUp = (index: number) => {
    if (index === 0) return;
    const newIds = [...formData.stage_ids];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    setFormData(prev => ({ ...prev, stage_ids: newIds }));
  };

  const moveStageDown = (index: number) => {
    if (index === formData.stage_ids.length - 1) return;
    const newIds = [...formData.stage_ids];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    setFormData(prev => ({ ...prev, stage_ids: newIds }));
  };

  const selectedStages = formData.stage_ids.map(id => stages.find(s => s.id === id)).filter(Boolean) as TenderStage[];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Редактировать шаблон' : 'Создать шаблон этапов'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2">
            <Label>Название шаблона <span className="text-red-500">*</span>{template?.is_system && <span className="ml-2 text-xs text-gray-500">(системный)</span>}</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Например: ФЗ-44, ЗМО" required readOnly={template?.is_system} disabled={template?.is_system} className={template?.is_system ? 'bg-gray-100' : ''} />
            <p className="text-xs text-gray-500">{template?.is_system ? 'Название системного шаблона нельзя изменить' : 'Краткое название для быстрого выбора'}</p>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Этапы для тендеров по ФЗ-44" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Иконка</Label>
            <Input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="📋" maxLength={2} className="w-20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Доступные этапы <span className="text-red-500">*</span></Label>
              <div className="max-h-64 overflow-y-auto space-y-3 border rounded-lg p-3">
                {[{ stages: tenderDeptStages, title: 'Предконтрактные', icon: '📋' }, { stages: realizationStages, title: 'Реализация', icon: '🚀' }, { stages: archiveStages, title: 'Архивные', icon: '📦' }].map(group => group.stages.length > 0 && (
                  <div key={group.title}>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{group.icon} {group.title}</h4>
                    <div className="space-y-1">{group.stages.map(stage => (
                      <label key={stage.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer border ${formData.stage_ids.includes(stage.id) ? 'bg-blue-50 border-blue-500' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <Checkbox checked={formData.stage_ids.includes(stage.id)} onCheckedChange={() => toggleStage(stage.id)} />
                        <span className="text-sm flex-1">{stage.name}</span>
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: stage.color || '#3b82f6' }} />
                      </label>
                    ))}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Выбранные этапы ({selectedStages.length})</Label>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3">
                {selectedStages.length === 0 ? <p className="text-center text-gray-400 py-6 text-sm">Выберите этапы слева</p> : (
                  <div className="space-y-1">{selectedStages.map((stage, index) => (
                    <div key={stage.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                      <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
                      <span className="text-sm flex-1">{stage.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStageUp(index)} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveStageDown(index)} disabled={index === selectedStages.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="template_active" checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: !!c })} />
            <label htmlFor="template_active" className="text-sm cursor-pointer">Шаблон активен</label>
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
