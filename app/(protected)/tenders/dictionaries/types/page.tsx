'use client';

import { useState, useEffect } from 'react';
import type { TenderType } from '@/lib/tenders/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MoreHorizontal, Pencil, Trash2, RefreshCw, AlertCircle, List } from 'lucide-react';

export default function TenderTypesPage() {
  const [types, setTypes] = useState<TenderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<TenderType | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // TODO: Получить company_id из контекста
  const companyId = '74b4c286-ca75-4eb4-9353-4db3d177c939';

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/tenders/types');
      if (!response.ok) {
        throw new Error('Ошибка загрузки типов');
      }

      const data = await response.json();
      setTypes(data.data || []);
    } catch (err) {
      console.error('Error loading types:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (type?: TenderType) => {
    if (type) {
      setEditingType(type);
      setFormData({ name: type.name, description: type.description || '' });
    } else {
      setEditingType(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    setFormData({ name: '', description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Введите название типа');
      return;
    }

    try {
      setSubmitting(true);

      const url = editingType
        ? `/api/tenders/types/${editingType.id}`
        : '/api/tenders/types';

      const method = editingType ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка сохранения типа');
      }

      await loadTypes();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving type:', err);
      alert('Ошибка при сохранении типа');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (typeId: string, typeName: string) => {
    if (!confirm(`Удалить тип "${typeName}"?`)) return;

    try {
      const response = await fetch(`/api/tenders/types/${typeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления типа');
      }

      await loadTypes();
    } catch (err) {
      console.error('Error deleting type:', err);
      alert('Ошибка при удалении типа');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadTypes}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Типы тендеров</h1>
          <p className="text-muted-foreground">
            Управление типами закупок (ФЗ-44, ФЗ-223 и т.д.)
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить тип
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {types.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <List className="h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет типов тендеров</h3>
              <p className="text-sm mb-4">Добавьте первый тип для начала работы</p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить тип
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {type.description || '—'}
                    </TableCell>
                    <TableCell>
                      {type.company_id ? (
                        <Badge variant="default">Пользовательский</Badge>
                      ) : (
                        <Badge variant="secondary">Системный</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {type.company_id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenModal(type)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(type.id, type.name)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Редактировать тип' : 'Добавить тип'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Измените название или описание типа тендера'
                : 'Создайте новый тип тендера для классификации закупок'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Например: ФЗ-44"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Краткое описание типа закупки"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
