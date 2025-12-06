'use client';

import { TenderStageTemplate, TenderStage } from '@/lib/tenders/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';

interface StageTemplatesTabProps {
  templates: TenderStageTemplate[];
  stages: TenderStage[];
  onAdd: () => void;
  onEdit: (template: TenderStageTemplate) => void;
  onDelete: (id: string) => void;
}

export function StageTemplatesTab({ templates, stages, onAdd, onEdit, onDelete }: StageTemplatesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Шаблоны наборов этапов</h2>
        <Button onClick={onAdd}><Plus className="h-4 w-4 mr-2" />Создать шаблон</Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-5xl mb-4">📚</div>
            <p className="font-medium text-gray-700 mb-2">Нет созданных шаблонов</p>
            <p className="text-sm text-gray-500 mb-6">Создайте шаблоны этапов (например «ФЗ-44», «ЗМО») для быстрого применения к тендерам</p>
            <Button onClick={onAdd}><Plus className="h-4 w-4 mr-2" />Создать первый шаблон</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <div className="font-semibold">{template.name}</div>
                      {template.description && <div className="text-sm text-gray-500">{template.description}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!template.is_system ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(template)} title="Редактировать"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => onDelete(template.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button>
                      </>
                    ) : (
                      <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-1" />Системный</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-2">ЭТАПЫ В ШАБЛОНЕ ({template.items?.length || 0})</div>
                  {template.items && template.items.length > 0 ? (
                    <div className="space-y-1">
                      {template.items.sort((a, b) => a.order_index - b.order_index).map((item, index) => {
                        const stage = stages.find(s => s.id === item.stage_id);
                        if (!stage) return null;
                        return (
                          <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded text-sm">
                            <span className="text-gray-400 w-5">{index + 1}.</span>
                            <span className="flex-1">{stage.name}</span>
                            <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: stage.color || '#3b82f6' }} />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">Этапы не выбраны</div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t">
                  <Badge variant={template.is_active ? 'default' : 'secondary'}>{template.is_active ? '✓ Активен' : '✗ Неактивен'}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
