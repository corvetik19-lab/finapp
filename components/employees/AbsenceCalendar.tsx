'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight, Plus, X, Check, Trash2, Loader2 } from "lucide-react";

interface Absence {
  id: string;
  employee_id: string;
  type: string;
  type_label: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  status_label: string;
  employee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface AbsenceCalendarProps {
  companyId: string;
  employeeId?: string;
  employees?: Array<{ id: string; full_name: string }>;
}

const ABSENCE_TYPES = [
  { value: 'vacation', label: 'Отпуск', color: '#22c55e', icon: '🏖️' },
  { value: 'sick', label: 'Больничный', color: '#ef4444', icon: '🏥' },
  { value: 'business_trip', label: 'Командировка', color: '#3b82f6', icon: '✈️' },
  { value: 'remote', label: 'Удалённая работа', color: '#8b5cf6', icon: '🏠' },
  { value: 'day_off', label: 'Отгул', color: '#f59e0b', icon: '📅' },
  { value: 'other', label: 'Другое', color: '#64748b', icon: '📝' },
];

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function AbsenceCalendar({ companyId, employeeId, employees }: AbsenceCalendarProps) {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employee_id: employeeId || '',
    type: 'vacation',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadAbsences = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      let url = `/api/employees/absences?companyId=${companyId}&startDate=${startDate}&endDate=${endDate}`;
      if (employeeId) {
        url += `&employeeId=${employeeId}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAbsences(data);
      }
    } catch (err) {
      console.error('Error loading absences:', err);
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [companyId, employeeId, year, month]);

  useEffect(() => {
    loadAbsences();
  }, [loadAbsences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.start_date || !formData.end_date) {
      setError('Заполните все обязательные поля');
      return;
    }

    setError(null);

    try {
      const response = await fetch('/api/employees/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          company_id: companyId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка создания');
      }

      await loadAbsences();
      setShowForm(false);
      setFormData({
        employee_id: employeeId || '',
        type: 'vacation',
        start_date: '',
        end_date: '',
        reason: ''
      });
    } catch (err) {
      console.error('Error creating absence:', err);
      setError(err instanceof Error ? err.message : 'Ошибка создания');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/employees/absences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });

      if (response.ok) {
        await loadAbsences();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить запись?')) return;

    try {
      const response = await fetch(`/api/employees/absences?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAbsences(absences.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Error deleting absence:', err);
    }
  };

  // Генерация дней календаря
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Понедельник = 0
    
    const days: Array<{ date: Date | null; absences: Absence[] }> = [];
    
    // Пустые ячейки до первого дня
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, absences: [] });
    }
    
    // Дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAbsences = absences.filter(a => {
        return dateStr >= a.start_date && dateStr <= a.end_date && a.status !== 'cancelled' && a.status !== 'rejected';
      });
      
      days.push({ date, absences: dayAbsences });
    }
    
    return days;
  }, [year, month, absences]);

  const getTypeColor = (type: string) => {
    return ABSENCE_TYPES.find(t => t.value === type)?.color || '#64748b';
  };

  const getTypeIcon = (type: string) => {
    return ABSENCE_TYPES.find(t => t.value === type)?.icon || '📝';
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  if (loading && absences.length === 0) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" />Загрузка календаря...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="text-lg font-semibold min-w-[160px] text-center">{MONTHS[month]} {year}</h3>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={today}>Сегодня</Button>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>{showForm ? <><X className="h-4 w-4 mr-1" />Отмена</> : <><Plus className="h-4 w-4 mr-1" />Добавить</>}</Button>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {showForm && (
        <Card><CardContent className="pt-4"><form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {!employeeId && employees && <Select value={formData.employee_id} onValueChange={v => setFormData({ ...formData, employee_id: v })}><SelectTrigger className="w-48"><SelectValue placeholder="Сотрудник" /></SelectTrigger><SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}</SelectContent></Select>}
            <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{ABSENCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="flex gap-2 items-center"><Input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="w-40" required /><span className="text-muted-foreground">—</span><Input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="w-40" required /></div>
          <Input placeholder="Причина (необязательно)" value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} />
          <Button type="submit"><Check className="h-4 w-4 mr-1" />Создать</Button>
        </form></CardContent></Card>
      )}

      {/* Легенда */}
      <div className="flex flex-wrap gap-3">{ABSENCE_TYPES.map(t => <div key={t.value} className="flex items-center gap-1 text-sm"><span className="w-3 h-3 rounded-full" style={{ background: t.color }} /><span>{t.icon} {t.label}</span></div>)}</div>

      {/* Календарь */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-muted">{WEEKDAYS.map(day => <div key={day} className="p-2 text-center text-sm font-medium">{day}</div>)}</div>
        <div className="grid grid-cols-7">{calendarDays.map((day, idx) => <div key={idx} className={`min-h-[60px] p-1 border-t border-l ${!day.date ? 'bg-muted/50' : ''} ${day.date?.toDateString() === new Date().toDateString() ? 'bg-blue-50' : ''}`}>{day.date && <><span className="text-sm font-medium">{day.date.getDate()}</span>{day.absences.length > 0 && <div className="flex flex-wrap gap-0.5 mt-1">{day.absences.slice(0, 3).map(a => <div key={a.id} className="w-2 h-2 rounded-full" style={{ background: getTypeColor(a.type) }} title={`${a.employee?.full_name || ''}: ${a.type_label}`} />)}{day.absences.length > 3 && <span className="text-xs text-muted-foreground">+{day.absences.length - 3}</span>}</div>}</>}</div>)}</div>
      </div>

      {/* Список */}
      <Card><CardHeader><CardTitle className="text-base">📋 Отсутствия в этом месяце</CardTitle></CardHeader><CardContent>
        {absences.length === 0 ? <p className="text-muted-foreground text-sm">Нет записей</p> : <div className="space-y-2">{absences.map(absence => <div key={absence.id} className="flex items-center gap-3 p-2 border rounded"><div className="w-1 h-10 rounded" style={{ background: getTypeColor(absence.type) }} /><div className="flex-1"><div className="flex items-center gap-2"><span>{getTypeIcon(absence.type)}</span><span className="font-medium text-sm">{absence.type_label}</span>{absence.employee && !employeeId && <Badge variant="outline" className="text-xs">{absence.employee.full_name}</Badge>}</div><div className="text-xs text-muted-foreground">{new Date(absence.start_date).toLocaleDateString('ru-RU')} — {new Date(absence.end_date).toLocaleDateString('ru-RU')}</div>{absence.reason && <div className="text-xs text-muted-foreground">{absence.reason}</div>}</div><div className="flex items-center gap-1"><Badge style={{ background: absence.status === 'approved' ? '#22c55e' : absence.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>{absence.status_label}</Badge>{absence.status === 'pending' && <><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusChange(absence.id, 'approved')} title="Одобрить"><Check className="h-4 w-4 text-green-600" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStatusChange(absence.id, 'rejected')} title="Отклонить"><X className="h-4 w-4 text-red-600" /></Button></>}<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(absence.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button></div></div>)}</div>}
      </CardContent></Card>
    </div>
  );
}
