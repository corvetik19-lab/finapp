"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  User,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Trash2,
  Phone,
  Mail,
} from "lucide-react";
import type { InvestmentSource, SourceType, CreateSourceInput } from "@/lib/investors/types";
import { SOURCE_TYPE_LABELS } from "@/lib/investors/types";
import { createSource, updateSource, deleteSource } from "@/lib/investors/service";
import { useToast } from "@/components/toast/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SourcesPageProps {
  sources: InvestmentSource[];
}

const SOURCE_TYPE_ICONS: Record<SourceType, typeof Building2> = {
  bank: Building2,
  private: User,
  fund: Briefcase,
  other: MoreHorizontal,
};

export function SourcesPage({ sources: initialSources }: SourcesPageProps) {
  const router = useRouter();
  const { show } = useToast();
  const [sources, setSources] = useState(initialSources);
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState<InvestmentSource | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<CreateSourceInput>({
    source_type: "bank",
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    bank_name: "",
    bank_bik: "",
    bank_account: "",
    correspondent_account: "",
    inn: "",
    kpp: "",
    ogrn: "",
    legal_address: "",
    default_interest_rate: undefined,
    default_period_days: undefined,
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      source_type: "bank",
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      bank_name: "",
      bank_bik: "",
      bank_account: "",
      correspondent_account: "",
      inn: "",
      kpp: "",
      ogrn: "",
      legal_address: "",
      default_interest_rate: undefined,
      default_period_days: undefined,
      notes: "",
    });
    setEditingSource(null);
    setShowForm(false);
  };

  const handleEdit = (source: InvestmentSource) => {
    setEditingSource(source);
    setFormData({
      source_type: source.source_type,
      name: source.name,
      contact_person: source.contact_person || "",
      phone: source.phone || "",
      email: source.email || "",
      bank_name: source.bank_name || "",
      bank_bik: source.bank_bik || "",
      bank_account: source.bank_account || "",
      correspondent_account: source.correspondent_account || "",
      inn: source.inn || "",
      kpp: source.kpp || "",
      ogrn: source.ogrn || "",
      legal_address: source.legal_address || "",
      default_interest_rate: source.default_interest_rate || undefined,
      default_period_days: source.default_period_days || undefined,
      notes: source.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      show("Введите название", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      if (editingSource) {
        const updated = await updateSource(editingSource.id, formData);
        setSources((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        show("Источник обновлён", { type: "success" });
      } else {
        const created = await createSource(formData);
        setSources((prev) => [...prev, created]);
        show("Источник добавлен", { type: "success" });
      }
      resetForm();
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить источник финансирования?")) return;

    setLoading(true);
    try {
      await deleteSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      show("Источник удалён", { type: "success" });
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Источники финансирования</h1>
          <p className="text-muted-foreground">Банки, инвесторы и фонды</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={loading}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить источник
        </Button>
      </div>

      {/* Форма */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSource ? "Редактирование источника" : "Новый источник"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Тип источника</Label>
                  <Select
                    value={formData.source_type}
                    onValueChange={(v) => setFormData({ ...formData, source_type: v as SourceType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Название *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ООО Инвест / Сбербанк"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Контактное лицо</Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="ФИО контакта"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>ИНН</Label>
                  <Input
                    value={formData.inn}
                    onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                    placeholder="1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ставка по умолчанию (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.default_interest_rate || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_interest_rate: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    placeholder="18.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Срок по умолчанию (дней)</Label>
                  <Input
                    type="number"
                    value={formData.default_period_days || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_period_days: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="60"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Примечания</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Дополнительная информация..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Отмена
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Сохранение..." : editingSource ? "Сохранить" : "Добавить"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Список */}
      {sources.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">Нет источников финансирования</h3>
          <p className="text-muted-foreground text-sm">Добавьте банки, инвесторов или фонды</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => {
            const Icon = SOURCE_TYPE_ICONS[source.source_type];
            return (
              <Card key={source.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    source.source_type === "bank" && "bg-blue-100 text-blue-600",
                    source.source_type === "private" && "bg-green-100 text-green-600",
                    source.source_type === "fund" && "bg-purple-100 text-purple-600",
                    source.source_type === "other" && "bg-gray-100 text-gray-600"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(source)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(source.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-lg">{source.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{SOURCE_TYPE_LABELS[source.source_type]}</p>

                  <div className="space-y-1 text-sm">
                    {source.contact_person && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{source.contact_person}</span>
                      </div>
                    )}
                    {source.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{source.phone}</span>
                      </div>
                    )}
                    {source.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{source.email}</span>
                      </div>
                    )}
                  </div>

                  {(source.default_interest_rate || source.default_period_days) && (
                    <div className="flex gap-2 mt-3">
                      {source.default_interest_rate && (
                        <Badge variant="secondary">{source.default_interest_rate}%</Badge>
                      )}
                      {source.default_period_days && (
                        <Badge variant="secondary">{source.default_period_days} дн.</Badge>
                      )}
                    </div>
                  )}

                  <Badge className="mt-3" variant={source.is_active ? "default" : "secondary"}>
                    {source.is_active ? "Активен" : "Неактивен"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
