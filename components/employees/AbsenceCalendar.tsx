'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './AbsenceCalendar.module.css';

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

  useEffect(() => {
    loadAbsences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, employeeId, year, month]);

  const loadAbsences = async () => {
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
  };

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
    return (
      <div className={styles.loading}>
        <span>⏳</span> Загрузка календаря...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.navigation}>
          <button onClick={prevMonth} className={styles.navButton}>◀</button>
          <h3 className={styles.title}>{MONTHS[month]} {year}</h3>
          <button onClick={nextMonth} className={styles.navButton}>▶</button>
          <button onClick={today} className={styles.todayButton}>Сегодня</button>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
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
          <div className={styles.formRow}>
            {!employeeId && employees && (
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className={styles.select}
                required
              >
                <option value="">Выберите сотрудника</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            )}
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={styles.select}
            >
              {ABSENCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className={styles.input}
              required
            />
            <span className={styles.dateSeparator}>—</span>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className={styles.input}
              required
            />
          </div>
          <input
            type="text"
            placeholder="Причина (необязательно)"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            className={styles.input}
          />
          <button type="submit" className={styles.submitButton}>
            ✅ Создать
          </button>
        </form>
      )}

      {/* Легенда */}
      <div className={styles.legend}>
        {ABSENCE_TYPES.map(t => (
          <div key={t.value} className={styles.legendItem}>
            <span className={styles.legendColor} style={{ background: t.color }} />
            <span>{t.icon} {t.label}</span>
          </div>
        ))}
      </div>

      {/* Календарь */}
      <div className={styles.calendar}>
        <div className={styles.weekdays}>
          {WEEKDAYS.map(day => (
            <div key={day} className={styles.weekday}>{day}</div>
          ))}
        </div>
        <div className={styles.days}>
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              className={`${styles.day} ${!day.date ? styles.emptyDay : ''} ${
                day.date?.toDateString() === new Date().toDateString() ? styles.today : ''
              }`}
            >
              {day.date && (
                <>
                  <span className={styles.dayNumber}>{day.date.getDate()}</span>
                  {day.absences.length > 0 && (
                    <div className={styles.dayAbsences}>
                      {day.absences.slice(0, 3).map(a => (
                        <div
                          key={a.id}
                          className={styles.absenceIndicator}
                          style={{ background: getTypeColor(a.type) }}
                          title={`${a.employee?.full_name || ''}: ${a.type_label}`}
                        />
                      ))}
                      {day.absences.length > 3 && (
                        <span className={styles.moreIndicator}>+{day.absences.length - 3}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Список отсутствий */}
      <div className={styles.list}>
        <h4 className={styles.listTitle}>📋 Отсутствия в этом месяце</h4>
        {absences.length === 0 ? (
          <div className={styles.empty}>Нет записей</div>
        ) : (
          absences.map(absence => (
            <div key={absence.id} className={styles.absenceItem}>
              <div 
                className={styles.absenceColor}
                style={{ background: getTypeColor(absence.type) }}
              />
              <div className={styles.absenceInfo}>
                <div className={styles.absenceHeader}>
                  <span className={styles.absenceIcon}>{getTypeIcon(absence.type)}</span>
                  <span className={styles.absenceType}>{absence.type_label}</span>
                  {absence.employee && !employeeId && (
                    <span className={styles.absenceEmployee}>{absence.employee.full_name}</span>
                  )}
                </div>
                <div className={styles.absenceDates}>
                  {new Date(absence.start_date).toLocaleDateString('ru-RU')} — {new Date(absence.end_date).toLocaleDateString('ru-RU')}
                </div>
                {absence.reason && (
                  <div className={styles.absenceReason}>{absence.reason}</div>
                )}
              </div>
              <div className={styles.absenceActions}>
                <span 
                  className={styles.absenceStatus}
                  style={{ 
                    background: absence.status === 'approved' ? '#22c55e' : 
                               absence.status === 'rejected' ? '#ef4444' : '#f59e0b'
                  }}
                >
                  {absence.status_label}
                </span>
                {absence.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(absence.id, 'approved')}
                      className={styles.approveButton}
                      title="Одобрить"
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => handleStatusChange(absence.id, 'rejected')}
                      className={styles.rejectButton}
                      title="Отклонить"
                    >
                      ❌
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(absence.id)}
                  className={styles.deleteButton}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
