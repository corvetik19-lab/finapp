'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, X, Pencil, Trash2, Users, Building2, Loader2 } from "lucide-react";

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
    return <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка отделов...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h4 className="font-semibold flex items-center gap-2"><Building2 className="h-5 w-5" />Отделы</h4><Button onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', description: '', color: COLORS[0] }); }} variant={showForm ? "outline" : "default"} size="sm">{showForm ? <><X className="h-4 w-4 mr-1" />Отмена</> : <><Plus className="h-4 w-4 mr-1" />Добавить</>}</Button></div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {showForm && <Card><CardContent className="pt-4"><form onSubmit={handleSubmit} className="space-y-3"><Input placeholder="Название отдела" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /><Textarea placeholder="Описание (необязательно)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} /><div className="flex gap-2 flex-wrap">{COLORS.map(c => <button key={c} type="button" className={`w-6 h-6 rounded-full border-2 ${formData.color === c ? 'border-foreground' : 'border-transparent'}`} style={{ background: c }} onClick={() => setFormData({ ...formData, color: c })} />)}</div><Button type="submit">{editingId ? 'Сохранить' : 'Создать'}</Button></form></CardContent></Card>}

      {departments.length === 0 ? <div className="text-center py-8"><Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Отделы не созданы</p></div> : <div className="space-y-2">{departments.map(dept => <Card key={dept.id}><CardContent className="pt-3 flex items-center gap-3"><div className="w-1 h-12 rounded" style={{ background: dept.color }} /><div className="flex-1"><div className="font-medium">{dept.name}</div>{dept.description && <div className="text-sm text-muted-foreground">{dept.description}</div>}<div className="flex gap-3 text-xs text-muted-foreground mt-1"><span className="flex items-center gap-1"><Users className="h-3 w-3" />{dept.employees_count}</span>{dept.head && <span>👤 {dept.head.full_name}</span>}</div></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleEdit(dept)} title="Редактировать"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(dept.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>)}</div>}
    </div>
  );
}
