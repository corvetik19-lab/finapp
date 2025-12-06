'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { formatCurrency } from '@/lib/tenders/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Pencil, Trash2, Receipt, Loader2 } from 'lucide-react';

interface TenderCost {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
}

interface TenderCostsTabProps {
  tender: Tender;
  onUpdate: () => void;
}

export function TenderCostsTab({ tender, onUpdate }: TenderCostsTabProps) {
  const [costs, setCosts] = useState<TenderCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadCosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tenders/${tender.id}/costs`);
      if (response.ok) {
        const data = await response.json();
        setCosts(data);
      }
    } catch (error) {
      console.error('Error loading costs:', error);
    } finally {
      setLoading(false);
    }
  }, [tender.id]);

  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      alert('Заполните обязательные поля');
      return;
    }

    try {
      const url = editingId 
        ? `/api/tenders/${tender.id}/costs/${editingId}`
        : `/api/tenders/${tender.id}/costs`;
      
      const method = editingId ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount) * 100, // конвертируем в копейки
        }),
      });

      if (response.ok) {
        setFormData({ category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
        setShowAddForm(false);
        setEditingId(null);
        loadCosts();
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving cost:', error);
      alert('Ошибка при сохранении');
    }
  };

  const handleEdit = (cost: TenderCost) => {
    setFormData({
      category: cost.category,
      description: cost.description || '',
      amount: (cost.amount / 100).toString(),
      date: cost.date,
    });
    setEditingId(cost.id);
    setShowAddForm(true);
  };

  const handleDelete = async (costId: string) => {
    if (!confirm('Удалить затрату?')) return;

    try {
      const response = await fetch(`/api/tenders/${tender.id}/costs/${costId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadCosts();
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting cost:', error);
    }
  };

  const handleCancel = () => {
    setFormData({ category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] });
    setShowAddForm(false);
    setEditingId(null);
  };

  const calculateTotal = () => {
    return filteredCosts.reduce((sum, cost) => sum + cost.amount, 0);
  };

  // Фильтрация и сортировка
  const filteredCosts = useMemo(() => {
    let filtered = costs;
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(c => c.category === filterCategory);
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'category') {
        comparison = a.category.localeCompare(b.category);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [costs, filterCategory, sortBy, sortOrder]);

  // Статистика по категориям
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number }>();
    
    costs.forEach(cost => {
      const current = stats.get(cost.category) || { count: 0, total: 0 };
      stats.set(cost.category, {
        count: current.count + 1,
        total: current.total + cost.amount,
      });
    });
    
    return Array.from(stats.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [costs]);

  const categories = [
    'Закупка товаров',
    'Логистика',
    'Монтаж',
    'Разгрузка',
    'Обеспечение заявки',
    'Обеспечение контракта',
    'Юридические услуги',
    'Консультации',
    'Прочее',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Загрузка затрат...
      </div>
    );
  }

  const totalAmount = costs.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Всего затрат</div>
            <div className="text-xl font-bold">{formatCurrency(totalAmount, tender.currency)}</div>
            <div className="text-xs text-gray-400">{costs.length} записей</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">НМЦК</div>
            <div className="text-xl font-bold">{formatCurrency(tender.nmck, tender.currency)}</div>
            <div className="text-xs text-gray-400">Начальная цена</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Остаток</div>
            <div className={`text-xl font-bold ${(tender.nmck - totalAmount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(tender.nmck - totalAmount, tender.currency)}
            </div>
            <div className="text-xs text-gray-400">
              {((1 - totalAmount / tender.nmck) * 100).toFixed(1)}% от НМЦК
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Категорий</div>
            <div className="text-xl font-bold">{categoryStats.length}</div>
            <div className="text-xs text-gray-400">Типов затрат</div>
          </CardContent>
        </Card>
      </div>

      {/* Заголовок с кнопкой */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Детализация затрат</h3>
        <Button 
          variant={showAddForm ? "outline" : "default"}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Отмена
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Добавить затрату
            </>
          )}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Категория *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Сумма (руб.) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Дата</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Дополнительная информация"
                />
              </div>

              <div className="col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Отмена
                </Button>
                <Button type="submit">
                  {editingId ? 'Сохранить' : 'Добавить'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Фильтры и сортировка */}
      {costs.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Категория:</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categoryStats.map(stat => (
                  <SelectItem key={stat.category} value={stat.category}>
                    {stat.category} ({stat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Сортировка:</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'amount' | 'category')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">По дате</SelectItem>
                <SelectItem value="amount">По сумме</SelectItem>
                <SelectItem value="category">По категории</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Порядок:</Label>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">По убыванию</SelectItem>
                <SelectItem value="asc">По возрастанию</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterCategory !== 'all' && (
            <div className="ml-auto text-sm text-gray-500">
              Показано {filteredCosts.length} из {costs.length} • 
              Сумма: {formatCurrency(calculateTotal(), tender.currency)}
            </div>
          )}
        </div>
      )}

      {costs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Затрат пока нет</p>
          <p className="text-sm">Добавьте первую затрату для этого тендера</p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Дата</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Категория</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Описание</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Сумма</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 w-[100px]">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCosts.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(cost.date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-4 py-3 text-sm">{cost.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{cost.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(cost.amount, tender.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(cost)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(cost.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg font-medium">
            <span>
              {filterCategory !== 'all' ? `Итого (${filterCategory}):` : 'Итого:'}
            </span>
            <span className="text-lg">
              {formatCurrency(calculateTotal(), tender.currency)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
