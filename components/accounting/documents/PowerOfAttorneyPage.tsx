"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  FileText,
  CheckCircle,
  Eye,
  Loader2,
  Download,
  Trash2,
  XCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import {
  createPowerOfAttorney,
  preparePowerOfAttorney,
  updatePowerOfAttorney,
  type PowerOfAttorney,
  type PowerOfAttorneyItem,
} from "@/lib/accounting/documents/power-of-attorney";
import type { AccountingCounterparty } from "@/lib/accounting/types";

interface PowerOfAttorneyPageProps {
  poas: PowerOfAttorney[];
  counterparties: AccountingCounterparty[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

function getStatusBadge(status: string, validUntil: string) {
  const isExpired = new Date(validUntil) < new Date();
  
  if (isExpired && status !== "cancelled" && status !== "used") {
    return <Badge variant="destructive">Просрочена</Badge>;
  }
  
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Черновик", variant: "outline" },
    issued: { label: "Выдана", variant: "secondary" },
    used: { label: "Использована", variant: "default" },
    cancelled: { label: "Аннулирована", variant: "destructive" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export function PowerOfAttorneyPage({ poas, counterparties }: PowerOfAttorneyPageProps) {
  const { show } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<PowerOfAttorney>>({
    items: [],
  });
  
  const [newItem, setNewItem] = useState<PowerOfAttorneyItem>({
    name: "",
    unit: "шт",
    quantity: 1,
  });

  const handleOpenCreate = async () => {
    setLoading(true);
    try {
      const prepared = await preparePowerOfAttorney();
      if (prepared) {
        setFormData({ ...prepared, items: [] });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setIsCreateOpen(true);
    }
  };

  const handleAddItem = () => {
    if (!newItem.name) return;
    
    setFormData({
      ...formData,
      items: [...(formData.items || []), { ...newItem }],
    });
    setNewItem({ name: "", unit: "шт", quantity: 1 });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: (formData.items || []).filter((_, i) => i !== index),
    });
  };

  const handleCreate = async () => {
    if (!formData.employee_name || !formData.supplier_name) {
      show("Заполните обязательные поля", { type: "error" });
      return;
    }
    
    if (!formData.items || formData.items.length === 0) {
      show("Добавьте хотя бы одну позицию ТМЦ", { type: "error" });
      return;
    }
    
    setLoading(true);
    try {
      const result = await createPowerOfAttorney(formData as Omit<PowerOfAttorney, "id" | "company_id" | "created_at">);
      
      if (result.success) {
        show("Доверенность создана", { type: "success" });
        setIsCreateOpen(false);
        window.location.reload();
      } else {
        show(result.error || "Ошибка создания", { type: "error" });
      }
    } catch (error) {
      show("Ошибка при создании", { type: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: PowerOfAttorney["status"]) => {
    const result = await updatePowerOfAttorney(id, { status: newStatus });
    if (result.success) {
      show("Статус обновлён", { type: "success" });
      window.location.reload();
    } else {
      show(result.error || "Ошибка", { type: "error" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Доверенности М-2
            </h1>
            <p className="text-muted-foreground">
              Доверенности на получение товарно-материальных ценностей
            </p>
          </div>
        </div>

        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Создать доверенность
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать доверенность М-2</DialogTitle>
            <DialogDescription>
              Заполните данные для новой доверенности
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Номер и даты */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Номер</Label>
                <Input
                  value={formData.number || ""}
                  onChange={e => setFormData({ ...formData, number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Дата выдачи</Label>
                <Input
                  type="date"
                  value={formData.issue_date || ""}
                  onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Действует до</Label>
                <Input
                  type="date"
                  value={formData.valid_until || ""}
                  onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            {/* Доверенное лицо */}
            <div className="space-y-3">
              <h4 className="font-medium">Доверенное лицо</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>ФИО *</Label>
                  <Input
                    value={formData.employee_name || ""}
                    onChange={e => setFormData({ ...formData, employee_name: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Должность</Label>
                  <Input
                    value={formData.employee_position || ""}
                    onChange={e => setFormData({ ...formData, employee_position: e.target.value })}
                    placeholder="Менеджер"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Серия паспорта</Label>
                  <Input
                    value={formData.employee_passport_series || ""}
                    onChange={e => setFormData({ ...formData, employee_passport_series: e.target.value })}
                    placeholder="45 00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Номер паспорта</Label>
                  <Input
                    value={formData.employee_passport_number || ""}
                    onChange={e => setFormData({ ...formData, employee_passport_number: e.target.value })}
                    placeholder="123456"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Кем выдан</Label>
                  <Input
                    value={formData.employee_passport_issued_by || ""}
                    onChange={e => setFormData({ ...formData, employee_passport_issued_by: e.target.value })}
                    placeholder="ОВД района..."
                  />
                </div>
              </div>
            </div>

            {/* Поставщик */}
            <div className="space-y-3">
              <h4 className="font-medium">Поставщик</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Наименование *</Label>
                  <Select
                    value={formData.supplier_name ? "" : "custom"}
                    onValueChange={v => {
                      if (v === "custom") return;
                      const cp = counterparties.find(c => c.id === v);
                      if (cp) {
                        setFormData({
                          ...formData,
                          supplier_name: cp.name,
                          supplier_inn: cp.inn || undefined,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите или введите" />
                    </SelectTrigger>
                    <SelectContent>
                      {counterparties.map(cp => (
                        <SelectItem key={cp.id} value={cp.id}>
                          {cp.short_name || cp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Или введите вручную</Label>
                  <Input
                    value={formData.supplier_name || ""}
                    onChange={e => setFormData({ ...formData, supplier_name: e.target.value })}
                    placeholder="Название поставщика"
                  />
                </div>
              </div>
            </div>

            {/* Документ-основание */}
            <div className="space-y-3">
              <h4 className="font-medium">Документ-основание</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Документ</Label>
                  <Input
                    value={formData.basis_document || ""}
                    onChange={e => setFormData({ ...formData, basis_document: e.target.value })}
                    placeholder="Счёт / Договор"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Номер</Label>
                  <Input
                    value={formData.basis_document_number || ""}
                    onChange={e => setFormData({ ...formData, basis_document_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Input
                    type="date"
                    value={formData.basis_document_date || ""}
                    onChange={e => setFormData({ ...formData, basis_document_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ТМЦ */}
            <div className="space-y-3">
              <h4 className="font-medium">Товарно-материальные ценности *</h4>
              
              {formData.items && formData.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Наименование</TableHead>
                      <TableHead>Ед.изм.</TableHead>
                      <TableHead>Кол-во</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Наименование</Label>
                  <Input
                    value={newItem.name}
                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Товар/материал"
                  />
                </div>
                <div className="w-24 space-y-2">
                  <Label>Ед.изм.</Label>
                  <Input
                    value={newItem.unit}
                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                  />
                </div>
                <div className="w-24 space-y-2">
                  <Label>Кол-во</Label>
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <Button type="button" variant="outline" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Создать доверенность
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Доверенности</CardTitle>
          <CardDescription>
            Всего {poas.length} доверенностей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {poas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Доверенное лицо</TableHead>
                  <TableHead>Поставщик</TableHead>
                  <TableHead>Позиций</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {poas.map(poa => (
                  <TableRow key={poa.id}>
                    <TableCell className="font-medium">{poa.number}</TableCell>
                    <TableCell>{formatDate(poa.issue_date)}</TableCell>
                    <TableCell>до {formatDate(poa.valid_until)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{poa.employee_name}</p>
                        {poa.employee_position && (
                          <p className="text-xs text-muted-foreground">{poa.employee_position}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{poa.supplier_name}</TableCell>
                    <TableCell>{poa.items?.length || 0}</TableCell>
                    <TableCell>{getStatusBadge(poa.status, poa.valid_until)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        {poa.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(poa.id!, "issued")}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {poa.status === "issued" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(poa.id!, "used")}
                              title="Использована"
                            >
                              <Clock className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStatusChange(poa.id!, "cancelled")}
                              title="Аннулировать"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет доверенностей</p>
              <p className="text-sm mt-2">
                Создайте первую доверенность М-2
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
