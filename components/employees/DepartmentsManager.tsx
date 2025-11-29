'use client';

import { useState, useEffect } from 'react';
import styles from './DepartmentsManager.module.css';

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  employees_count: number;
  head?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  parent?: {
    id: string;
    name: string;
  } | null;
}

interface DepartmentsManagerProps {
  companyId: string;
}

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export function DepartmentsManager({ companyId }: DepartmentsManagerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: COLORS[0]
  });

  useEffect(() => {
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/departments?companyId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error('Error loading departments:', err);
      setError('Ошибка загрузки отделов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Введите название отдела');
      return;
    }

    setError(null);

    try {
      const url = '/api/departments';
      const method = editingId ? 'PATCH' : 'POST';
      const body = editingId 
        ? { id: editingId, ...formData }
        : { company_id: companyId, ...formData };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка сохранения');
      }

      await loadDepartments();
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', color: COLORS[0] });
    } catch (err) {
      console.error('Error saving department:', err);
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  const handleEdit = (dept: Department) => {
    setFormData({
      name: dept.name,
      description: dept.description || '',
      color: dept.color
    });
    setEditingId(dept.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить отдел?')) return;

    try {
      const response = await fetch(`/api/departments?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка удаления');
      }

      setDepartments(departments.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting department:', err);
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка отделов...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>🏢 Отделы</h4>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', description: '', color: COLORS[0] });
          }}
          className={styles.addButton}
        >
          {showForm ? '✕ Отмена' : '➕ Добавить'}
        </button>
      </div>

      {error && (
        <div className={styles.error}>{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            placeholder="Название отдела"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.input}
            required
          />
          <textarea
            placeholder="Описание (необязательно)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={styles.textarea}
            rows={2}
          />
          <div className={styles.colors}>
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                className={`${styles.colorButton} ${formData.color === color ? styles.colorSelected : ''}`}
                style={{ background: color }}
                onClick={() => setFormData({ ...formData, color })}
              />
            ))}
          </div>
          <button type="submit" className={styles.submitButton}>
            {editingId ? '💾 Сохранить' : '➕ Создать'}
          </button>
        </form>
      )}

      {departments.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🏢</span>
          <p>Отделы не созданы</p>
        </div>
      ) : (
        <div className={styles.list}>
          {departments.map((dept) => (
            <div key={dept.id} className={styles.department}>
              <div 
                className={styles.colorBar}
                style={{ background: dept.color }}
              />
              <div className={styles.deptInfo}>
                <div className={styles.deptName}>{dept.name}</div>
                {dept.description && (
                  <div className={styles.deptDesc}>{dept.description}</div>
                )}
                <div className={styles.deptMeta}>
                  <span>👥 {dept.employees_count} сотрудников</span>
                  {dept.head && (
                    <span>👤 {dept.head.full_name}</span>
                  )}
                </div>
              </div>
              <div className={styles.deptActions}>
                <button
                  onClick={() => handleEdit(dept)}
                  className={styles.actionButton}
                  title="Редактировать"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className={styles.actionButton}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
