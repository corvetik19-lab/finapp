"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Pencil, Trash2, Star, Building2, MapPin, Landmark, Phone, Copy, Loader2, AlertTriangle } from "lucide-react";

interface LegalEntity {
  id: string;
  full_name: string;
  short_name: string | null;
  legal_form: string | null;
  inn: string;
  kpp: string | null;
  ogrn: string | null;
  okpo: string | null;
  okved: string | null;
  registration_date: string | null;
  legal_address: string | null;
  actual_address: string | null;
  bank_name: string | null;
  bank_bik: string | null;
  bank_account: string | null;
  bank_corr_account: string | null;
  director_name: string | null;
  director_position: string | null;
  director_basis: string | null;
  accountant_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_system: string | null;
  is_default: boolean;
  is_active: boolean;
  notes: string | null;
}

interface Props {
  initialEntities: LegalEntity[];
}

const LEGAL_FORMS = ["ООО", "ИП", "АО", "ПАО", "НКО", "Другое"];
const TAX_SYSTEMS = [
  { value: "osno", label: "ОСНО" },
  { value: "usn_income", label: "УСН (Доходы)" },
  { value: "usn_income_expense", label: "УСН (Доходы-Расходы)" },
  { value: "patent", label: "Патент" },
  { value: "npd", label: "НПД" },
];

const emptyForm = {
  full_name: "", short_name: "", inn: "", kpp: "", ogrn: "", okpo: "", okved: "",
  registration_date: "", legal_address: "", actual_address: "",
  bank_name: "", bank_bik: "", bank_account: "", bank_corr_account: "",
  director_name: "", director_position: "Генеральный директор", director_basis: "Устава",
  accountant_name: "", phone: "", email: "", website: "",
  legal_form: "ООО", tax_system: "osno", is_default: false, is_active: true, notes: "",
};

export function LegalEntitiesManager({ initialEntities }: Props) {
  const router = useRouter();
  const [entities, setEntities] = useState<LegalEntity[]>(initialEntities);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<LegalEntity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"main" | "address" | "bank" | "contacts">("main");
  const [error, setError] = useState("");

  useEffect(() => { setEntities(initialEntities); }, [initialEntities]);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/legal-entities");
    if (res.ok) setEntities(await res.json());
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setTab("main");
    setError("");
    setIsOpen(true);
  };

  const openEdit = (e: LegalEntity) => {
    setEditing(e);
    setForm({
      full_name: e.full_name || "", short_name: e.short_name || "", inn: e.inn || "",
      kpp: e.kpp || "", ogrn: e.ogrn || "", okpo: e.okpo || "", okved: e.okved || "",
      registration_date: e.registration_date || "", legal_address: e.legal_address || "",
      actual_address: e.actual_address || "", bank_name: e.bank_name || "",
      bank_bik: e.bank_bik || "", bank_account: e.bank_account || "",
      bank_corr_account: e.bank_corr_account || "", director_name: e.director_name || "",
      director_position: e.director_position || "", director_basis: e.director_basis || "",
      accountant_name: e.accountant_name || "", phone: e.phone || "", email: e.email || "",
      website: e.website || "", legal_form: e.legal_form || "", tax_system: e.tax_system || "",
      is_default: e.is_default, is_active: e.is_active, notes: e.notes || "",
    });
    setTab("main");
    setError("");
    setIsOpen(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) { setError("Укажите наименование"); return; }
    if (!form.inn || form.inn.length < 10) { setError("ИНН должен быть 10-12 цифр"); return; }
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/legal-entities/${editing.id}` : "/api/legal-entities";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Ошибка");
      const saved = await res.json();
      if (editing) setEntities(p => p.map(x => x.id === saved.id ? saved : x));
      else setEntities(p => [saved, ...p]);
      setIsOpen(false);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Ошибка"); }
    finally { setSaving(false); }
  };

  const remove = async (e: LegalEntity) => {
    if (!confirm(`Удалить "${e.short_name || e.full_name}"?`)) return;
    await fetch(`/api/legal-entities/${e.id}`, { method: "DELETE" });
    setEntities(p => p.filter(x => x.id !== e.id));
    router.refresh();
  };

  const setDefault = async (e: LegalEntity) => {
    await fetch(`/api/legal-entities/${e.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_default: true }),
    });
    loadData();
  };

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6" />Юридические лица</h1><p className="text-sm text-muted-foreground">Реквизиты организаций</p></div><Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Добавить</Button></div>

      {entities.length === 0 ? <div className="text-center py-12"><Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><h3 className="font-medium">Нет юр. лиц</h3><p className="text-muted-foreground text-sm">Добавьте первое</p><Button className="mt-2" onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Добавить</Button></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map(e => <Card key={e.id} className={e.is_default ? 'border-primary' : ''}><CardContent className="pt-4"><div className="flex items-start gap-3">{e.is_default && <Badge className="absolute top-2 right-2"><Star className="h-3 w-3 mr-1" />По умолч.</Badge>}<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold">{(e.short_name || e.full_name).charAt(0)}</div><div className="flex-1"><h3 className="font-medium">{e.short_name || e.full_name}</h3>{e.short_name && <p className="text-xs text-muted-foreground">{e.full_name}</p>}</div></div><div className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">ИНН</span><span>{e.inn}</span></div>{e.kpp && <div className="flex justify-between"><span className="text-muted-foreground">КПП</span><span>{e.kpp}</span></div>}{e.director_name && <div className="flex justify-between"><span className="text-muted-foreground">Рук.</span><span>{e.director_name}</span></div>}</div><div className="flex gap-1 mt-3">{!e.is_default && <Button variant="ghost" size="icon" onClick={() => setDefault(e)} title="По умолч."><Star className="h-4 w-4" /></Button>}<Button variant="ghost" size="icon" onClick={() => openEdit(e)} title="Ред."><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(e)} title="Удал."><Trash2 className="h-4 w-4" /></Button></div></CardContent></Card>)}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Редактирование" : "Новое юр. лицо"}</DialogTitle></DialogHeader>
        {error && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}><TabsList className="grid grid-cols-4 w-full"><TabsTrigger value="main"><Building2 className="h-4 w-4 mr-1" />Основное</TabsTrigger><TabsTrigger value="address"><MapPin className="h-4 w-4 mr-1" />Адреса</TabsTrigger><TabsTrigger value="bank"><Landmark className="h-4 w-4 mr-1" />Банк</TabsTrigger><TabsTrigger value="contacts"><Phone className="h-4 w-4 mr-1" />Контакты</TabsTrigger></TabsList>
          <TabsContent value="main" className="space-y-3"><div className="space-y-1"><Label>Полное наименование *</Label><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder='ООО "Название"' /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Краткое</Label><Input value={form.short_name} onChange={e => set("short_name", e.target.value)} /></div><div className="space-y-1"><Label>Форма</Label><Select value={form.legal_form} onValueChange={v => set("legal_form", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEGAL_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div></div><p className="text-sm font-medium pt-2">Регистрация</p><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>ИНН *</Label><Input value={form.inn} onChange={e => set("inn", e.target.value.replace(/\D/g, "").slice(0, 12))} maxLength={12} /></div><div className="space-y-1"><Label>КПП</Label><Input value={form.kpp} onChange={e => set("kpp", e.target.value.replace(/\D/g, "").slice(0, 9))} maxLength={9} /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>ОГРН</Label><Input value={form.ogrn} onChange={e => set("ogrn", e.target.value.replace(/\D/g, "").slice(0, 15))} maxLength={15} /></div><div className="space-y-1"><Label>ОКПО</Label><Input value={form.okpo} onChange={e => set("okpo", e.target.value.replace(/\D/g, "").slice(0, 14))} maxLength={14} /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>ОКВЭД</Label><Input value={form.okved} onChange={e => set("okved", e.target.value)} /></div><div className="space-y-1"><Label>Дата рег.</Label><Input type="date" value={form.registration_date} onChange={e => set("registration_date", e.target.value)} /></div></div><div className="space-y-1"><Label>Система налогообложения</Label><Select value={form.tax_system} onValueChange={v => set("tax_system", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TAX_SYSTEMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div><p className="text-sm font-medium pt-2">Руководство</p><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>ФИО руководителя</Label><Input value={form.director_name} onChange={e => set("director_name", e.target.value)} /></div><div className="space-y-1"><Label>Должность</Label><Input value={form.director_position} onChange={e => set("director_position", e.target.value)} /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Основание</Label><Input value={form.director_basis} onChange={e => set("director_basis", e.target.value)} /></div><div className="space-y-1"><Label>Гл. бухгалтер</Label><Input value={form.accountant_name} onChange={e => set("accountant_name", e.target.value)} /></div></div><div className="flex gap-4"><label className="flex items-center gap-2"><Checkbox checked={form.is_default} onCheckedChange={c => set("is_default", !!c)} />По умолчанию</label><label className="flex items-center gap-2"><Checkbox checked={form.is_active} onCheckedChange={c => set("is_active", !!c)} />Активно</label></div></TabsContent>
          <TabsContent value="address" className="space-y-3"><p className="text-sm font-medium">Юридический адрес</p><Textarea value={form.legal_address} onChange={e => set("legal_address", e.target.value)} rows={2} /><p className="text-sm font-medium">Фактический адрес</p><Textarea value={form.actual_address} onChange={e => set("actual_address", e.target.value)} rows={2} /><Button variant="outline" onClick={() => set("actual_address", form.legal_address)}><Copy className="h-4 w-4 mr-1" />Скопировать юр. адрес</Button></TabsContent>
          <TabsContent value="bank" className="space-y-3"><div className="space-y-1"><Label>Банк</Label><Input value={form.bank_name} onChange={e => set("bank_name", e.target.value)} placeholder='ПАО "Сбербанк"' /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>БИК</Label><Input value={form.bank_bik} onChange={e => set("bank_bik", e.target.value.replace(/\D/g, "").slice(0, 9))} maxLength={9} /></div><div className="space-y-1"><Label>К/с</Label><Input value={form.bank_corr_account} onChange={e => set("bank_corr_account", e.target.value.replace(/\D/g, "").slice(0, 20))} maxLength={20} /></div></div><div className="space-y-1"><Label>Р/с</Label><Input value={form.bank_account} onChange={e => set("bank_account", e.target.value.replace(/\D/g, "").slice(0, 20))} maxLength={20} /></div></TabsContent>
          <TabsContent value="contacts" className="space-y-3"><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Телефон</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+7" /></div><div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div></div><div className="space-y-1"><Label>Сайт</Label><Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" /></div><div className="space-y-1"><Label>Примечания</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} /></div></TabsContent>
        </Tabs>
        <DialogFooter><Button variant="outline" onClick={() => setIsOpen(false)}>Отмена</Button><Button onClick={save} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : 'Сохранить'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
