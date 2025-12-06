"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Customer, CustomerInput, CustomerType, CustomerFilters, CUSTOMER_TYPE_LABELS, CUSTOMER_TYPE_COLORS } from "@/types/customer";
import { createCustomer, updateCustomer, deleteCustomer, toggleCustomerActive, getCustomerTenders, getCustomerEmployees } from "@/lib/dictionaries/customers-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Plus, Search, Eye, Pencil, Trash2, Loader2, Building2, Users, CheckCircle, Landmark, Store, Building, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast/ToastContext";

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
  const toast = useToast();
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
      toast.show(editingCustomer ? "Заказчик обновлён" : "Заказчик добавлен", { type: "success" });
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
        toast.show("Заказчик удалён", { type: "success" });
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
        toast.show("Статус изменён", { type: "success" });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6" />Заказчики</h1><p className="text-sm text-muted-foreground">Справочник заказчиков для тендеров</p></div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Добавить заказчика</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><Users className="h-5 w-5 text-blue-500" /><div><div className="text-xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Всего</div></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle className="h-5 w-5 text-green-500" /><div><div className="text-xl font-bold">{stats.active}</div><div className="text-xs text-muted-foreground">Активных</div></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Landmark className="h-5 w-5 text-blue-500" /><div><div className="text-xl font-bold">{stats.byType.government || 0}</div><div className="text-xs text-muted-foreground">Гос.</div></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Store className="h-5 w-5 text-green-500" /><div><div className="text-xl font-bold">{stats.byType.commercial || 0}</div><div className="text-xs text-muted-foreground">Комм.</div></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Building className="h-5 w-5 text-amber-500" /><div><div className="text-xl font-bold">{stats.byType.municipal || 0}</div><div className="text-xs text-muted-foreground">Муниц.</div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Поиск по названию, ИНН, контакту..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-9 pr-9" />{filters.search && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setFilters({ ...filters, search: "" })}><X className="h-4 w-4" /></Button>}</div>
        <Select value={filters.customer_type} onValueChange={(v) => setFilters({ ...filters, customer_type: v as CustomerType | "all" })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все типы</SelectItem><SelectItem value="government">Государственные</SelectItem><SelectItem value="commercial">Коммерческие</SelectItem><SelectItem value="municipal">Муниципальные</SelectItem></SelectContent></Select>
        <Select value={filters.is_active === "all" ? "all" : filters.is_active ? "active" : "inactive"} onValueChange={(v) => setFilters({ ...filters, is_active: v === "all" ? "all" : v === "active" })}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все статусы</SelectItem><SelectItem value="active">Активные</SelectItem><SelectItem value="inactive">Неактивные</SelectItem></SelectContent></Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12"><Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-medium">Заказчики не найдены</h3><p className="text-sm text-muted-foreground mt-1">{filters.search || filters.customer_type !== "all" || filters.is_active !== "all" ? "Попробуйте изменить параметры фильтрации" : "Добавьте первого заказчика"}</p>{!filters.search && filters.customer_type === "all" && filters.is_active === "all" && <Button className="mt-4" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Добавить заказчика</Button>}</div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Название</TableHead><TableHead>ИНН</TableHead><TableHead>Тип</TableHead><TableHead>Регион</TableHead><TableHead>Контакт</TableHead><TableHead>Статус</TableHead><TableHead className="w-28">Действия</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className={cn(!customer.is_active && "opacity-50")}>
                  <TableCell><div className="font-medium">{customer.name}</div>{customer.short_name && <div className="text-xs text-muted-foreground">({customer.short_name})</div>}</TableCell>
                  <TableCell className="text-sm">{customer.inn || "—"}</TableCell>
                  <TableCell><Badge style={{ backgroundColor: CUSTOMER_TYPE_COLORS[customer.customer_type] + "20", color: CUSTOMER_TYPE_COLORS[customer.customer_type] }}>{CUSTOMER_TYPE_LABELS[customer.customer_type]}</Badge></TableCell>
                  <TableCell className="text-sm">{customer.region || "—"}</TableCell>
                  <TableCell>{customer.contact_person ? <div><div className="text-sm">{customer.contact_person}</div>{customer.phone && <div className="text-xs text-muted-foreground">{customer.phone}</div>}</div> : "—"}</TableCell>
                  <TableCell><Badge variant={customer.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggleActive(customer.id)}>{customer.is_active ? "Активен" : "Неактивен"}</Badge></TableCell>
                  <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => handleViewDetails(customer)} title="Просмотр"><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleEdit(customer)} title="Редактировать"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(customer.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{customer ? "Редактировать заказчика" : "Новый заказчик"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Основная информация</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Название *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Полное название" required /></div>
              <div className="space-y-1"><Label>Краткое название</Label><Input value={form.short_name || ""} onChange={(e) => setForm({ ...form, short_name: e.target.value })} placeholder="Сокращённое" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Тип заказчика</Label><Select value={form.customer_type} onValueChange={(v) => setForm({ ...form, customer_type: v as CustomerType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="government">Государственный</SelectItem><SelectItem value="commercial">Коммерческий</SelectItem><SelectItem value="municipal">Муниципальный</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Регион</Label><Input value={form.region || ""} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Москва..." /></div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Реквизиты</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>ИНН</Label><Input value={form.inn || ""} onChange={(e) => setForm({ ...form, inn: e.target.value })} placeholder="1234567890" maxLength={12} /></div>
              <div className="space-y-1"><Label>КПП</Label><Input value={form.kpp || ""} onChange={(e) => setForm({ ...form, kpp: e.target.value })} placeholder="123456789" maxLength={9} /></div>
              <div className="space-y-1"><Label>ОГРН</Label><Input value={form.ogrn || ""} onChange={(e) => setForm({ ...form, ogrn: e.target.value })} placeholder="1234567890123" maxLength={15} /></div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Адреса</h4>
            <div className="space-y-1"><Label>Юридический адрес</Label><Input value={form.legal_address || ""} onChange={(e) => setForm({ ...form, legal_address: e.target.value })} placeholder="Полный юридический адрес" /></div>
            <div className="space-y-1"><Label>Фактический адрес</Label><Input value={form.actual_address || ""} onChange={(e) => setForm({ ...form, actual_address: e.target.value })} placeholder="Фактический адрес" /></div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Контакты</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Контактное лицо</Label><Input value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="ФИО" /></div>
              <div className="space-y-1"><Label>Телефон</Label><Input type="tel" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (999) 123-45-67" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" /></div>
              <div className="space-y-1"><Label>Сайт</Label><Input type="url" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" /></div>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Дополнительно</h4>
            <div className="space-y-1"><Label>Заметки</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Дополнительная информация..." rows={2} /></div>
            <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: !!c })} /><span className="text-sm">Активный заказчик</span></label>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" disabled={isLoading || !form.name.trim()}>{isLoading ? "Сохранение..." : customer ? "Сохранить" : "Создать"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const formatMoney = (kopeks: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(kopeks / 100);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-blue-500" />{customer.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 text-sm">
            {customer.inn && <div><span className="text-muted-foreground">ИНН</span><div className="font-medium">{customer.inn}</div></div>}
            {customer.region && <div><span className="text-muted-foreground">Регион</span><div className="font-medium">{customer.region}</div></div>}
            {customer.contact_person && <div><span className="text-muted-foreground">Контакт</span><div className="font-medium">{customer.contact_person}</div></div>}
            {customer.phone && <div><span className="text-muted-foreground">Телефон</span><div className="font-medium">{customer.phone}</div></div>}
          </div>
          <div><h4 className="font-medium flex items-center gap-1 mb-2"><Users className="h-4 w-4" />Сотрудники ({employees.length})</h4>
            {isLoading ? <div className="flex items-center gap-2 text-muted-foreground p-4"><Loader2 className="h-4 w-4 animate-spin" />Загрузка...</div> : employees.length === 0 ? <div className="text-muted-foreground text-sm p-4 text-center">Нет связанных сотрудников</div> : (
              <div className="grid grid-cols-2 gap-2">{employees.map((emp) => <Card key={emp.id}><CardContent className="p-3 flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">{emp.full_name.charAt(0).toUpperCase()}</div><div className="flex-1"><div className="font-medium text-sm">{emp.full_name}</div><div className="text-xs text-muted-foreground">{emp.role}</div></div><div className="text-right"><div className="font-medium">{emp.tenders_count}</div><div className="text-xs text-muted-foreground">тендеров</div></div></CardContent></Card>)}</div>
            )}
          </div>
          <div><h4 className="font-medium flex items-center gap-1 mb-2"><Building2 className="h-4 w-4" />Тендеры ({tenders.length})</h4>
            {isLoading ? <div className="flex items-center gap-2 text-muted-foreground p-4"><Loader2 className="h-4 w-4 animate-spin" />Загрузка...</div> : tenders.length === 0 ? <div className="text-muted-foreground text-sm p-4 text-center">Нет связанных тендеров</div> : (
              <div className="space-y-2 max-h-60 overflow-y-auto">{tenders.map((tender) => <Card key={tender.id}><CardContent className="p-3"><div className="flex justify-between items-start"><span className="text-xs font-medium">{tender.purchase_number}</span><Badge variant="outline">{tender.stage_name}</Badge></div><div className="text-sm mt-1 line-clamp-2">{tender.subject}</div><div className="flex justify-between items-center mt-2 text-xs"><span className="font-medium">{formatMoney(tender.nmck)}</span>{tender.manager_name && <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{tender.manager_name}</span>}</div></CardContent></Card>)}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
