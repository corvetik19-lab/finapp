"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./DepartmentsSettings.module.css";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Управление отделами</h2>
          <p className={styles.subtitle}>
            Создавайте отделы и назначайте сотрудников
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={handleCreate}>
          <span className="material-icons">add</span>
          Создать отдел
        </button>
      </div>

      <div className={styles.departmentsList}>
        {departments.map(dept => (
          <div key={dept.id} className={styles.departmentCard}>
            <div className={styles.departmentHeader}>
              <div className={styles.departmentInfo}>
                <div 
                  className={styles.departmentColor} 
                  style={{ backgroundColor: dept.color }}
                />
                <div>
                  <div className={styles.departmentName}>
                    {dept.name}
                    {dept.parent && (
                      <span className={styles.parentBadge}>
                        ← {dept.parent.name}
                      </span>
                    )}
                  </div>
                  <div className={styles.departmentDescription}>
                    {dept.description || "Без описания"}
                  </div>
                </div>
              </div>
              <div className={styles.departmentActions}>
                <button
                  className={styles.btnIcon}
                  onClick={() => handleAssignEmployees(dept)}
                  title="Назначить сотрудников"
                >
                  <span className="material-icons">group_add</span>
                </button>
                <button
                  className={styles.btnIcon}
                  onClick={() => handleEdit(dept)}
                  title="Редактировать"
                >
                  <span className="material-icons">edit</span>
                </button>
                <button
                  className={styles.btnIconDanger}
                  onClick={() => handleDelete(dept)}
                  title="Удалить"
                >
                  <span className="material-icons">delete</span>
                </button>
              </div>
            </div>
            
            <div className={styles.departmentMeta}>
              <div className={styles.metaItem}>
                <span className="material-icons">people</span>
                <span>{dept.employees_count} сотрудников</span>
              </div>
              {dept.head && (
                <div className={styles.metaItem}>
                  <span className="material-icons">person</span>
                  <span>Руководитель: {dept.head.full_name}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <div className={styles.emptyState}>
            <span className="material-icons">business</span>
            <p>Нет созданных отделов</p>
            <button className={styles.btnSecondary} onClick={handleCreate}>
              Создать первый отдел
            </button>
          </div>
        )}
      </div>

      {/* Модалка создания/редактирования */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div 
            className={`${styles.modal} ${isFullscreen ? styles.modalFullscreen : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>{editingDept ? "Редактировать отдел" : "Создать отдел"}</h3>
              <div className={styles.modalHeaderActions}>
                <button
                  className={styles.fullscreenBtn}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Свернуть" : "Развернуть"}
                >
                  <span className="material-icons">
                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  </span>
                </button>
                <button
                  className={styles.closeBtn}
                  onClick={() => setShowModal(false)}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Название отдела *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Отдел продаж, Бухгалтерия"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Описание</label>
                <textarea
                  className={styles.formTextarea}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание отдела"
                  rows={3}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Руководитель</label>
                  <select
                    className={styles.formSelect}
                    value={formData.head_id}
                    onChange={e => setFormData({ ...formData, head_id: e.target.value })}
                  >
                    <option value="">Не назначен</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Родительский отдел</label>
                  <select
                    className={styles.formSelect}
                    value={formData.parent_id}
                    onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                  >
                    <option value="">Нет (корневой)</option>
                    {departments
                      .filter(d => d.id !== editingDept?.id)
                      .map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Цвет</label>
                <div className={styles.colorPicker}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`${styles.colorOption} ${formData.color === color ? styles.colorSelected : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowModal(false)}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : editingDept ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка назначения сотрудников */}
      {showAssignModal && assigningDept && (
        <div className={styles.modalOverlay} onClick={() => setShowAssignModal(false)}>
          <div 
            className={`${styles.modal} ${isFullscreen ? styles.modalFullscreen : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                Назначить сотрудников в отдел &laquo;{assigningDept.name}&raquo;
              </h3>
              <div className={styles.modalHeaderActions}>
                <button
                  className={styles.fullscreenBtn}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Свернуть" : "Развернуть"}
                >
                  <span className="material-icons">
                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                  </span>
                </button>
                <button
                  className={styles.closeBtn}
                  onClick={() => setShowAssignModal(false)}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.assignInfo}>
                <span className="material-icons">info</span>
                Выберите сотрудников для назначения в отдел. 
                Сотрудники будут перемещены из текущего отдела.
              </div>

              <div className={styles.employeesList}>
                {employees.map(emp => {
                  const isSelected = selectedEmployees.includes(emp.id);
                  const currentDept = departments.find(d => d.id === emp.department_id);
                  
                  return (
                    <label 
                      key={emp.id} 
                      className={`${styles.employeeItem} ${isSelected ? styles.employeeSelected : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEmployee(emp.id)}
                      />
                      <div className={styles.employeeAvatar}>
                        {emp.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={emp.avatar_url} alt="" />
                        ) : (
                          <span>{emp.full_name.charAt(0)}</span>
                        )}
                      </div>
                      <div className={styles.employeeInfo}>
                        <div className={styles.employeeName}>{emp.full_name}</div>
                        {currentDept && currentDept.id !== assigningDept.id && (
                          <div className={styles.employeeDept}>
                            Сейчас: {currentDept.name}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}

                {employees.length === 0 && (
                  <div className={styles.emptyEmployees}>
                    Нет доступных сотрудников
                  </div>
                )}
              </div>

              <div className={styles.selectedCount}>
                Выбрано: {selectedEmployees.length} из {employees.length}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnSecondary}
                onClick={() => setShowAssignModal(false)}
                disabled={isSaving}
              >
                Отмена
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSaveAssignments}
                disabled={isSaving}
              >
                {isSaving ? "Сохранение..." : "Сохранить назначения"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
