"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, UserPlus, Building2, Loader2, Info } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
  department_id: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  head_id: string | null;
  parent_id: string | null;
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

interface DepartmentsSettingsProps {
  departments: Department[];
  employees: Employee[];
  companyId: string;
}

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function DepartmentsSettings({ 
  departments: initialDepartments, 
  employees,
  companyId 
}: DepartmentsSettingsProps) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: COLORS[0],
    head_id: "",
    parent_id: ""
  });

  // Модалка назначения сотрудников
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningDept, setAssigningDept] = useState<Department | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const handleCreate = () => {
    setEditingDept(null);
    setFormData({
      name: "",
      description: "",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      head_id: "",
      parent_id: ""
    });
    setShowModal(true);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || "",
      color: dept.color,
      head_id: dept.head_id || "",
      parent_id: dept.parent_id || ""
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Введите название отдела");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingDept 
        ? `/api/departments?id=${editingDept.id}` 
        : "/api/departments";
      const method = editingDept ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          company_id: companyId,
          head_id: formData.head_id || null,
          parent_id: formData.parent_id || null
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка сохранения");
      }

      const savedDept = await res.json();
      
      if (editingDept) {
        // Обновляем существующий отдел
        setDepartments(departments.map(d => 
          d.id === editingDept.id ? { ...d, ...savedDept, employees_count: d.employees_count } : d
        ));
      } else {
        // Добавляем новый отдел
        setDepartments([...departments, { ...savedDept, employees_count: 0 }]);
      }

      setShowModal(false);
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (dept.employees_count > 0) {
      alert(`Нельзя удалить отдел с сотрудниками (${dept.employees_count} чел.)`);
      return;
    }

    if (!confirm(`Удалить отдел "${dept.name}"?`)) return;

    try {
      const res = await fetch(`/api/departments?id=${dept.id}`, { 
        method: "DELETE" 
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка удаления");
      }

      setDepartments(departments.filter(d => d.id !== dept.id));
      router.refresh();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при удалении");
    }
  };

  // Открыть модалку назначения сотрудников
  const handleAssignEmployees = (dept: Department) => {
    setAssigningDept(dept);
    // Выбираем сотрудников которые уже в этом отделе
    const deptEmployees = employees.filter(e => e.department_id === dept.id).map(e => e.id);
    setSelectedEmployees(deptEmployees);
    setShowAssignModal(true);
  };

  // Сохранить назначения
  const handleSaveAssignments = async () => {
    if (!assigningDept) return;

    setIsSaving(true);
    try {
      // Обновляем department_id для выбранных сотрудников
      const res = await fetch("/api/departments/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department_id: assigningDept.id,
          employee_ids: selectedEmployees,
          company_id: companyId
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка назначения");
      }

      setShowAssignModal(false);
      router.refresh();
    } catch (error) {
      console.error("Assign error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при назначении");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Управление отделами</h2><p className="text-sm text-muted-foreground">Создавайте отделы и назначайте сотрудников</p></div><Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Создать отдел</Button></div>

      <div className="space-y-3">
        {departments.map(dept => <Card key={dept.id}><CardContent className="pt-4"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} /><div><div className="font-medium">{dept.name}{dept.parent && <Badge variant="outline" className="ml-2 text-xs">← {dept.parent.name}</Badge>}</div><div className="text-sm text-muted-foreground">{dept.description || "Без описания"}</div></div></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleAssignEmployees(dept)} title="Назначить"><UserPlus className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleEdit(dept)} title="Редактировать"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(dept)} title="Удалить"><Trash2 className="h-4 w-4" /></Button></div></div><div className="flex gap-4 mt-3 text-sm text-muted-foreground"><div className="flex items-center gap-1"><Users className="h-4 w-4" />{dept.employees_count} сотр.</div>{dept.head && <div>Рук.: {dept.head.full_name}</div>}</div></CardContent></Card>)}
        {departments.length === 0 && <div className="text-center py-12"><Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p>Нет созданных отделов</p><Button variant="outline" className="mt-2" onClick={handleCreate}>Создать первый отдел</Button></div>}
      </div>

      {/* Модалка создания/редактирования */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent><DialogHeader><DialogTitle>{editingDept ? "Редактировать отдел" : "Создать отдел"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Название *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Отдел продаж, Бухгалтерия" /></div>
            <div className="space-y-1"><Label>Описание</Label><Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Краткое описание" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Руководитель</Label><Select value={formData.head_id || "__none__"} onValueChange={v => setFormData({ ...formData, head_id: v === "__none__" ? "" : v })}><SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger><SelectContent><SelectItem value="__none__">Не назначен</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Родительский</Label><Select value={formData.parent_id || "__none__"} onValueChange={v => setFormData({ ...formData, parent_id: v === "__none__" ? "" : v })}><SelectTrigger><SelectValue placeholder="Нет" /></SelectTrigger><SelectContent><SelectItem value="__none__">Нет (корневой)</SelectItem>{departments.filter(d => d.id !== editingDept?.id).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1"><Label>Цвет</Label><div className="flex gap-2 flex-wrap">{COLORS.map(c => <button key={c} type="button" className={`w-6 h-6 rounded-full border-2 ${formData.color === c ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setFormData({ ...formData, color: c })} />)}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>Отмена</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : editingDept ? 'Сохранить' : 'Создать'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модалка назначения сотрудников */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Назначить сотрудников в &laquo;{assigningDept?.name}&raquo;</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Info className="h-4 w-4" />Выберите сотрудников для назначения в отдел</div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {employees.map(emp => { const isSelected = selectedEmployees.includes(emp.id); const currentDept = departments.find(d => d.id === emp.department_id); return (<label key={emp.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted ${isSelected ? 'bg-muted' : ''}`}><Checkbox checked={isSelected} onCheckedChange={() => toggleEmployee(emp.id)} /><div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">{emp.avatar_url ? <Image src={emp.avatar_url} alt="" fill className="rounded-full object-cover" /> : emp.full_name.charAt(0)}</div><div className="flex-1"><div className="text-sm font-medium">{emp.full_name}</div>{currentDept && currentDept.id !== assigningDept?.id && <div className="text-xs text-muted-foreground">Сейчас: {currentDept.name}</div>}</div></label>); })}
              {employees.length === 0 && <div className="text-center py-4 text-muted-foreground">Нет доступных сотрудников</div>}
            </div>
            <div className="text-sm text-muted-foreground">Выбрано: {selectedEmployees.length} из {employees.length}</div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowAssignModal(false)} disabled={isSaving}>Отмена</Button><Button onClick={handleSaveAssignments} disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : 'Сохранить'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
