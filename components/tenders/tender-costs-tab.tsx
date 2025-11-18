'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Tender } from '@/lib/tenders/types';
import { formatCurrency } from '@/lib/tenders/types';
import styles from './tender-costs-tab.module.css';

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
    return <div className={styles.container}>Загрузка затрат...</div>;
  }

  const totalAmount = costs.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <div className={styles.container}>
      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Всего затрат</div>
          <div className={styles.statValue}>{formatCurrency(totalAmount, tender.currency)}</div>
          <div className={styles.statSubtext}>{costs.length} записей</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>НМЦК</div>
          <div className={styles.statValue}>{formatCurrency(tender.nmck, tender.currency)}</div>
          <div className={styles.statSubtext}>Начальная цена</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Остаток</div>
          <div className={styles.statValue} style={{ 
            color: (tender.nmck - totalAmount) > 0 ? '#059669' : '#dc2626' 
          }}>
            {formatCurrency(tender.nmck - totalAmount, tender.currency)}
          </div>
          <div className={styles.statSubtext}>
            {((1 - totalAmount / tender.nmck) * 100).toFixed(1)}% от НМЦК
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Категорий</div>
          <div className={styles.statValue}>{categoryStats.length}</div>
          <div className={styles.statSubtext}>Типов затрат</div>
        </div>
      </div>

      {/* Заголовок с кнопкой */}
      <div className={styles.header}>
        <h3>Детализация затрат</h3>
        <button 
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? (
            <>
              <span className={styles.buttonIcon}>✕</span>
              Отмена
            </>
          ) : (
            <>
              <span className={styles.buttonIcon}>+</span>
              Добавить затрату
            </>
          )}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} style={{ 
          background: '#f9fafb', 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          marginBottom: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Категория *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            >
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Сумма (руб.) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              placeholder="0.00"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Дата
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Описание
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Дополнительная информация"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleCancel} className={styles.button}>
              Отмена
            </button>
            <button type="submit" className={styles.addButton}>
              {editingId ? '✓ Сохранить' : '✓ Добавить'}
            </button>
          </div>
        </form>
      )}

      {/* Фильтры и сортировка */}
      {costs.length > 0 && (
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Категория:</label>
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Все категории</option>
              {categoryStats.map(stat => (
                <option key={stat.category} value={stat.category}>
                  {stat.category} ({stat.count})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Сортировка:</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'category')}
              className={styles.filterSelect}
            >
              <option value="date">По дате</option>
              <option value="amount">По сумме</option>
              <option value="category">По категории</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Порядок:</label>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className={styles.filterSelect}
            >
              <option value="desc">↓ По убыванию</option>
              <option value="asc">↑ По возрастанию</option>
            </select>
          </div>

          {filterCategory !== 'all' && (
            <div className={styles.filterInfo}>
              Показано {filteredCosts.length} из {costs.length} • 
              Сумма: {formatCurrency(calculateTotal(), tender.currency)}
            </div>
          )}
        </div>
      )}

      {costs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>💰 Затрат пока нет</p>
          <p>Добавьте первую затрату для этого тендера</p>
        </div>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Категория</th>
                <th>Описание</th>
                <th style={{ textAlign: 'right' }}>Сумма</th>
                <th style={{ width: '120px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredCosts.map((cost) => (
                <tr key={cost.id}>
                  <td>{new Date(cost.date).toLocaleDateString('ru-RU')}</td>
                  <td>{cost.category}</td>
                  <td>{cost.description || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>
                    {formatCurrency(cost.amount, tender.currency)}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={styles.button}
                        onClick={() => handleEdit(cost)}
                      >
                        ✏️
                      </button>
                      <button 
                        className={styles.button}
                        onClick={() => handleDelete(cost.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.total}>
            <span>
              {filterCategory !== 'all' ? `Итого (${filterCategory}):` : 'Итого:'}
            </span>
            <span>
              {formatCurrency(calculateTotal(), tender.currency)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
