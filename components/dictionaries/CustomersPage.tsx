"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Customer, CustomerInput, CustomerType, CustomerFilters, CUSTOMER_TYPE_LABELS, CUSTOMER_TYPE_COLORS } from "@/types/customer";
import { createCustomer, updateCustomer, deleteCustomer, toggleCustomerActive, getCustomerTenders, getCustomerEmployees } from "@/lib/dictionaries/customers-service";
import styles from "./CustomersPage.module.css";

interface CustomersPageProps {
  initialCustomers: Customer[];
  stats: {
    total: number;
    active: number;
    byType: Record<string, number>;
  };
}

export default function CustomersPage({ initialCustomers, stats }: CustomersPageProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [filters, setFilters] = useState<CustomerFilters>({
    search: "",
    customer_type: "all",
    is_active: "all",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerTenders, setCustomerTenders] = useState<{
    id: string;
    purchase_number: string;
    subject: string;
    nmck: number;
    status: string;
    stage_name: string;
    manager_name: string | null;
    executor_name: string | null;
  }[]>([]);
  const [customerEmployees, setCustomerEmployees] = useState<{
    id: string;
    full_name: string;
    role: string;
    tenders_count: number;
  }[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Фильтрация
  const filteredCustomers = customers.filter((c) => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(search);
      const matchShortName = c.short_name?.toLowerCase().includes(search);
      const matchInn = c.inn?.toLowerCase().includes(search);
      const matchContact = c.contact_person?.toLowerCase().includes(search);
      if (!matchName && !matchShortName && !matchInn && !matchContact) return false;
    }
    if (filters.customer_type !== "all" && c.customer_type !== filters.customer_type) return false;
    if (filters.is_active !== "all" && c.is_active !== filters.is_active) return false;
    return true;
  });

  // Открыть модалку для создания
  const handleCreate = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  // Открыть модалку для редактирования
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  // Сохранить заказчика
  const handleSave = async (input: CustomerInput) => {
    setIsLoading(true);
    try {
      if (editingCustomer) {
        const result = await updateCustomer(editingCustomer.id, input);
        if (result.success && result.data) {
          setCustomers((prev) =>
            prev.map((c) => (c.id === editingCustomer.id ? result.data! : c))
          );
        }
      } else {
        const result = await createCustomer(input);
        if (result.success && result.data) {
          setCustomers((prev) => [...prev, result.data!]);
        }
      }
      setIsModalOpen(false);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // Удалить заказчика
  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить заказчика?")) return;
    
    setIsLoading(true);
    try {
      const result = await deleteCustomer(id);
      if (result.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Переключить активность
  const handleToggleActive = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await toggleCustomerActive(id);
      if (result.success) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: !c.is_active } : c))
        );
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Просмотр деталей заказчика (тендеры и сотрудники)
  const handleViewDetails = async (customer: Customer) => {
    setViewingCustomer(customer);
    setIsDetailsLoading(true);
    try {
      const [tenders, employees] = await Promise.all([
        getCustomerTenders(customer.id),
        getCustomerEmployees(customer.id),
      ]);
      setCustomerTenders(tenders);
      setCustomerEmployees(employees);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Закрыть детали
  const handleCloseDetails = () => {
    setViewingCustomer(null);
    setCustomerTenders([]);
    setCustomerEmployees([]);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            <span className="material-icons">business_center</span>
            Заказчики
          </h1>
          <p className={styles.subtitle}>Справочник заказчиков для тендеров</p>
        </div>
        <button className={styles.addButton} onClick={handleCreate}>
          <span className="material-icons">add</span>
          Добавить заказчика
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className="material-icons" style={{ color: "#3b82f6" }}>groups</span>
          <div>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Всего</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className="material-icons" style={{ color: "#22c55e" }}>check_circle</span>
          <div>
            <div className={styles.statValue}>{stats.active}</div>
            <div className={styles.statLabel}>Активных</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className="material-icons" style={{ color: "#3b82f6" }}>account_balance</span>
          <div>
            <div className={styles.statValue}>{stats.byType.government || 0}</div>
            <div className={styles.statLabel}>Гос.</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className="material-icons" style={{ color: "#22c55e" }}>store</span>
          <div>
            <div className={styles.statValue}>{stats.byType.commercial || 0}</div>
            <div className={styles.statLabel}>Комм.</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className="material-icons" style={{ color: "#f59e0b" }}>location_city</span>
          <div>
            <div className={styles.statValue}>{stats.byType.municipal || 0}</div>
            <div className={styles.statLabel}>Муниц.</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Поиск по названию, ИНН, контакту..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          {filters.search && (
            <button onClick={() => setFilters({ ...filters, search: "" })}>
              <span className="material-icons">close</span>
            </button>
          )}
        </div>
        <select
          value={filters.customer_type}
          onChange={(e) => setFilters({ ...filters, customer_type: e.target.value as CustomerType | "all" })}
          className={styles.filterSelect}
        >
          <option value="all">Все типы</option>
          <option value="government">Государственные</option>
          <option value="commercial">Коммерческие</option>
          <option value="municipal">Муниципальные</option>
        </select>
        <select
          value={filters.is_active === "all" ? "all" : filters.is_active ? "active" : "inactive"}
          onChange={(e) => {
            const val = e.target.value;
            setFilters({
              ...filters,
              is_active: val === "all" ? "all" : val === "active",
            });
          }}
          className={styles.filterSelect}
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="inactive">Неактивные</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        {filteredCustomers.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="material-icons">business_center</span>
            <h3>Заказчики не найдены</h3>
            <p>
              {filters.search || filters.customer_type !== "all" || filters.is_active !== "all"
                ? "Попробуйте изменить параметры фильтрации"
                : "Добавьте первого заказчика"}
            </p>
            {!filters.search && filters.customer_type === "all" && filters.is_active === "all" && (
              <button className={styles.addButton} onClick={handleCreate}>
                <span className="material-icons">add</span>
                Добавить заказчика
              </button>
            )}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>ИНН</th>
                <th>Тип</th>
                <th>Регион</th>
                <th>Контакт</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className={!customer.is_active ? styles.inactiveRow : ""}>
                  <td>
                    <div className={styles.nameCell}>
                      <strong>{customer.name}</strong>
                      {customer.short_name && (
                        <span className={styles.shortName}>({customer.short_name})</span>
                      )}
                    </div>
                  </td>
                  <td>{customer.inn || "—"}</td>
                  <td>
                    <span
                      className={styles.typeBadge}
                      style={{ backgroundColor: CUSTOMER_TYPE_COLORS[customer.customer_type] + "20", color: CUSTOMER_TYPE_COLORS[customer.customer_type] }}
                    >
                      {CUSTOMER_TYPE_LABELS[customer.customer_type]}
                    </span>
                  </td>
                  <td>{customer.region || "—"}</td>
                  <td>
                    {customer.contact_person && (
                      <div className={styles.contactCell}>
                        <div>{customer.contact_person}</div>
                        {customer.phone && <small>{customer.phone}</small>}
                      </div>
                    )}
                    {!customer.contact_person && "—"}
                  </td>
                  <td>
                    <button
                      className={`${styles.statusBadge} ${customer.is_active ? styles.active : styles.inactive}`}
                      onClick={() => handleToggleActive(customer.id)}
                      title={customer.is_active ? "Деактивировать" : "Активировать"}
                    >
                      {customer.is_active ? "Активен" : "Неактивен"}
                    </button>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleViewDetails(customer)}
                        title="Просмотр тендеров и сотрудников"
                      >
                        <span className="material-icons">visibility</span>
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEdit(customer)}
                        title="Редактировать"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(customer.id)}
                        title="Удалить"
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CustomerModal
          customer={editingCustomer}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          isLoading={isLoading}
        />
      )}

      {/* Details Modal */}
      {viewingCustomer && (
        <CustomerDetailsModal
          customer={viewingCustomer}
          tenders={customerTenders}
          employees={customerEmployees}
          isLoading={isDetailsLoading}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}

// Modal Component
interface CustomerModalProps {
  customer: Customer | null;
  onSave: (input: CustomerInput) => void;
  onClose: () => void;
  isLoading: boolean;
}

function CustomerModal({ customer, onSave, onClose, isLoading }: CustomerModalProps) {
  const [form, setForm] = useState<CustomerInput>({
    name: customer?.name || "",
    short_name: customer?.short_name || "",
    inn: customer?.inn || "",
    kpp: customer?.kpp || "",
    ogrn: customer?.ogrn || "",
    legal_address: customer?.legal_address || "",
    actual_address: customer?.actual_address || "",
    region: customer?.region || "",
    contact_person: customer?.contact_person || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    website: customer?.website || "",
    customer_type: customer?.customer_type || "government",
    notes: customer?.notes || "",
    is_active: customer?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{customer ? "Редактировать заказчика" : "Новый заказчик"}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalForm}>
          {/* Основная информация */}
          <fieldset className={styles.fieldset}>
            <legend>Основная информация</legend>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Название *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Полное название организации"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Краткое название</label>
                <input
                  type="text"
                  value={form.short_name || ""}
                  onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                  placeholder="Сокращённое название"
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Тип заказчика</label>
                <select
                  value={form.customer_type}
                  onChange={(e) => setForm({ ...form, customer_type: e.target.value as CustomerType })}
                >
                  <option value="government">Государственный</option>
                  <option value="commercial">Коммерческий</option>
                  <option value="municipal">Муниципальный</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Регион</label>
                <input
                  type="text"
                  value={form.region || ""}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="Москва, Московская область..."
                />
              </div>
            </div>
          </fieldset>

          {/* Реквизиты */}
          <fieldset className={styles.fieldset}>
            <legend>Реквизиты</legend>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>ИНН</label>
                <input
                  type="text"
                  value={form.inn || ""}
                  onChange={(e) => setForm({ ...form, inn: e.target.value })}
                  placeholder="1234567890"
                  maxLength={12}
                />
              </div>
              <div className={styles.formGroup}>
                <label>КПП</label>
                <input
                  type="text"
                  value={form.kpp || ""}
                  onChange={(e) => setForm({ ...form, kpp: e.target.value })}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
              <div className={styles.formGroup}>
                <label>ОГРН</label>
                <input
                  type="text"
                  value={form.ogrn || ""}
                  onChange={(e) => setForm({ ...form, ogrn: e.target.value })}
                  placeholder="1234567890123"
                  maxLength={15}
                />
              </div>
            </div>
          </fieldset>

          {/* Адреса */}
          <fieldset className={styles.fieldset}>
            <legend>Адреса</legend>
            <div className={styles.formGroup}>
              <label>Юридический адрес</label>
              <input
                type="text"
                value={form.legal_address || ""}
                onChange={(e) => setForm({ ...form, legal_address: e.target.value })}
                placeholder="Полный юридический адрес"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Фактический адрес</label>
              <input
                type="text"
                value={form.actual_address || ""}
                onChange={(e) => setForm({ ...form, actual_address: e.target.value })}
                placeholder="Фактический адрес (если отличается)"
              />
            </div>
          </fieldset>

          {/* Контакты */}
          <fieldset className={styles.fieldset}>
            <legend>Контакты</legend>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Контактное лицо</label>
                <input
                  type="text"
                  value={form.contact_person || ""}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  placeholder="ФИО контактного лица"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Телефон</label>
                <input
                  type="tel"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Сайт</label>
                <input
                  type="url"
                  value={form.website || ""}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </fieldset>

          {/* Дополнительно */}
          <fieldset className={styles.fieldset}>
            <legend>Дополнительно</legend>
            <div className={styles.formGroup}>
              <label>Заметки</label>
              <textarea
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Дополнительная информация о заказчике..."
                rows={3}
              />
            </div>
            <div className={styles.checkboxGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span>Активный заказчик</span>
              </label>
            </div>
          </fieldset>

          {/* Actions */}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className={styles.saveButton} disabled={isLoading || !form.name.trim()}>
              {isLoading ? "Сохранение..." : customer ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Customer Details Modal Component
interface CustomerDetailsModalProps {
  customer: Customer;
  tenders: {
    id: string;
    purchase_number: string;
    subject: string;
    nmck: number;
    status: string;
    stage_name: string;
    manager_name: string | null;
    executor_name: string | null;
  }[];
  employees: {
    id: string;
    full_name: string;
    role: string;
    tenders_count: number;
  }[];
  isLoading: boolean;
  onClose: () => void;
}

function CustomerDetailsModal({ customer, tenders, employees, isLoading, onClose }: CustomerDetailsModalProps) {
  const formatMoney = (kopeks: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(kopeks / 100);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className={styles.modalHeader}>
          <h2>
            <span className="material-icons" style={{ marginRight: 8, color: '#3b82f6' }}>business_center</span>
            {customer.name}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className={styles.modalForm} style={{ gap: '24px' }}>
          {/* Customer Info */}
          <div className={styles.detailsGrid}>
            {customer.inn && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>ИНН</span>
                <span className={styles.detailValue}>{customer.inn}</span>
              </div>
            )}
            {customer.region && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Регион</span>
                <span className={styles.detailValue}>{customer.region}</span>
              </div>
            )}
            {customer.contact_person && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Контакт</span>
                <span className={styles.detailValue}>{customer.contact_person}</span>
              </div>
            )}
            {customer.phone && (
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Телефон</span>
                <span className={styles.detailValue}>{customer.phone}</span>
              </div>
            )}
          </div>

          {/* Employees */}
          <fieldset className={styles.fieldset}>
            <legend>
              <span className="material-icons" style={{ fontSize: 16, marginRight: 4 }}>people</span>
              Сотрудники ({employees.length})
            </legend>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Загрузка...</div>
            ) : employees.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Нет связанных сотрудников
              </div>
            ) : (
              <div className={styles.employeesList}>
                {employees.map((emp) => (
                  <div key={emp.id} className={styles.employeeCard}>
                    <div className={styles.employeeAvatar}>
                      {emp.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.employeeInfo}>
                      <div className={styles.employeeName}>{emp.full_name}</div>
                      <div className={styles.employeeRole}>{emp.role}</div>
                    </div>
                    <div className={styles.employeeStat}>
                      <span>{emp.tenders_count}</span>
                      <small>тендеров</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          {/* Tenders */}
          <fieldset className={styles.fieldset}>
            <legend>
              <span className="material-icons" style={{ fontSize: 16, marginRight: 4 }}>description</span>
              Тендеры ({tenders.length})
            </legend>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Загрузка...</div>
            ) : tenders.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                Нет связанных тендеров. Заказчик будет автоматически привязан при переводе тендера в реализацию.
              </div>
            ) : (
              <div className={styles.tendersList}>
                {tenders.map((tender) => (
                  <div key={tender.id} className={styles.tenderCard}>
                    <div className={styles.tenderHeader}>
                      <span className={styles.tenderNumber}>{tender.purchase_number}</span>
                      <span className={styles.tenderStage}>{tender.stage_name}</span>
                    </div>
                    <div className={styles.tenderSubject}>{tender.subject}</div>
                    <div className={styles.tenderFooter}>
                      <span className={styles.tenderPrice}>{formatMoney(tender.nmck)}</span>
                      {tender.manager_name && (
                        <span className={styles.tenderManager}>
                          <span className="material-icons" style={{ fontSize: 14 }}>person</span>
                          {tender.manager_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        </div>
      </div>
    </div>
  );
}
