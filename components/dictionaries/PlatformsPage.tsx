"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Platform, PlatformInput, PlatformFilters } from "@/types/platform";
import { createPlatform, updatePlatform, deletePlatform, togglePlatformActive, getPlatformTenders } from "@/lib/dictionaries/platforms-service";
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
import { Store, Plus, Search, Eye, Pencil, ToggleLeft, ToggleRight, Trash2, Loader2, Building2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast/ToastContext";

interface PlatformsPageProps {
  initialPlatforms: Platform[];
  stats: {
    total: number;
    active: number;
  };
  tendersStats: Record<string, number>;
}

interface PlatformTender {
  id: string;
  purchase_number: string;
  subject: string;
  nmck: number;
  status: string;
  customer: string;
}

export default function PlatformsPage({ initialPlatforms, stats, tendersStats }: PlatformsPageProps) {
  const router = useRouter();
  const toast = useToast();
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [filters, setFilters] = useState<PlatformFilters>({
    search: "",
    is_active: "all",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingPlatform, setViewingPlatform] = useState<Platform | null>(null);
  const [platformTenders, setPlatformTenders] = useState<PlatformTender[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  // Фильтрация
  const filteredPlatforms = platforms.filter((p) => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(search);
      const matchShortName = p.short_name?.toLowerCase().includes(search);
      const matchUrl = p.url?.toLowerCase().includes(search);
      if (!matchName && !matchShortName && !matchUrl) return false;
    }
    if (filters.is_active !== "all" && p.is_active !== filters.is_active) return false;
    return true;
  });

  // Открыть модалку для создания
  const handleCreate = () => {
    setEditingPlatform(null);
    setIsModalOpen(true);
  };

  // Открыть модалку для редактирования
  const handleEdit = (platform: Platform) => {
    setEditingPlatform(platform);
    setIsModalOpen(true);
  };

  // Сохранить площадку
  const handleSave = async (input: PlatformInput) => {
    setIsLoading(true);
    try {
      if (editingPlatform) {
        const result = await updatePlatform(editingPlatform.id, input);
        if (result.success && result.data) {
          setPlatforms((prev) =>
            prev.map((p) => (p.id === editingPlatform.id ? result.data! : p))
          );
        }
      } else {
        const result = await createPlatform(input);
        if (result.success && result.data) {
          setPlatforms((prev) => [...prev, result.data!]);
        }
      }
      setIsModalOpen(false);
      toast.show(editingPlatform ? "Площадка обновлена" : "Площадка добавлена", { type: "success" });
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // Удалить площадку
  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить площадку?")) return;
    
    setIsLoading(true);
    try {
      const result = await deletePlatform(id);
      if (result.success) {
        setPlatforms((prev) => prev.filter((p) => p.id !== id));
        toast.show("Площадка удалена", { type: "success" });
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
      const result = await togglePlatformActive(id);
      if (result.success) {
        setPlatforms((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
        );
        toast.show("Статус изменён", { type: "success" });
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Просмотр тендеров площадки
  const handleViewDetails = async (platform: Platform) => {
    setViewingPlatform(platform);
    setIsDetailsLoading(true);
    try {
      const tenders = await getPlatformTenders(platform.id);
      setPlatformTenders(tenders);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  // Закрыть детали
  const handleCloseDetails = () => {
    setViewingPlatform(null);
    setPlatformTenders([]);
  };

  // Форматирование суммы
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Store className="h-6 w-6" />Площадки</h1><p className="text-sm text-muted-foreground">Справочник торговых площадок</p></div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Добавить площадку</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-sm text-muted-foreground">Всего площадок</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{stats.active}</div><div className="text-sm text-muted-foreground">Активных</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-muted-foreground">{stats.total - stats.active}</div><div className="text-sm text-muted-foreground">Неактивных</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Поиск по названию или URL..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-9" /></div>
        <Select value={filters.is_active === "all" ? "all" : filters.is_active ? "active" : "inactive"} onValueChange={(v) => setFilters({ ...filters, is_active: v === "all" ? "all" : v === "active" })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все</SelectItem><SelectItem value="active">Активные</SelectItem><SelectItem value="inactive">Неактивные</SelectItem></SelectContent></Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Название</TableHead><TableHead>Сокращение</TableHead><TableHead>URL</TableHead><TableHead>Тендеры</TableHead><TableHead>Статус</TableHead><TableHead className="w-32">Действия</TableHead></TableRow></TableHeader>
          <TableBody>
            {filteredPlatforms.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{platforms.length === 0 ? "Площадки не найдены. Добавьте первую площадку." : "Нет площадок, соответствующих фильтрам"}</TableCell></TableRow>
            ) : (
              filteredPlatforms.map((platform) => (
                <TableRow key={platform.id} className={cn(!platform.is_active && "opacity-50")}>
                  <TableCell className="font-medium">{platform.name}</TableCell>
                  <TableCell>{platform.short_name || "—"}</TableCell>
                  <TableCell>{platform.url ? <a href={platform.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{platform.url}<ExternalLink className="h-3 w-3" /></a> : "—"}</TableCell>
                  <TableCell><Button variant="link" className="p-0 h-auto" onClick={() => handleViewDetails(platform)}>{tendersStats[platform.id] || 0}</Button></TableCell>
                  <TableCell><Badge variant={platform.is_active ? "default" : "secondary"}>{platform.is_active ? "Активна" : "Неактивна"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewDetails(platform)} title="Тендеры"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(platform)} title="Редактировать"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleActive(platform.id)} title={platform.is_active ? "Деактивировать" : "Активировать"}>{platform.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}</Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(platform.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal for create/edit */}
      {isModalOpen && (
        <PlatformModal
          platform={editingPlatform}
          onSave={handleSave}
          onClose={() => setIsModalOpen(false)}
          isLoading={isLoading}
        />
      )}

      {/* Details panel */}
      <Dialog open={!!viewingPlatform} onOpenChange={(o) => !o && handleCloseDetails()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Store className="h-5 w-5" />{viewingPlatform?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Сокращённое</span><div className="font-medium">{viewingPlatform?.short_name || "—"}</div></div>
              <div><span className="text-muted-foreground">URL</span><div className="font-medium">{viewingPlatform?.url ? <a href={viewingPlatform.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{viewingPlatform.url}</a> : "—"}</div></div>
              <div><span className="text-muted-foreground">Описание</span><div className="font-medium">{viewingPlatform?.description || "—"}</div></div>
              <div><span className="text-muted-foreground">Статус</span><div><Badge variant={viewingPlatform?.is_active ? "default" : "secondary"}>{viewingPlatform?.is_active ? "Активна" : "Неактивна"}</Badge></div></div>
            </div>
            <div><h4 className="font-medium mb-2">Тендеры ({platformTenders.length})</h4>
              {isDetailsLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Загрузка...</div> : platformTenders.length === 0 ? <div className="text-muted-foreground text-sm">Нет тендеров</div> : (
                <div className="space-y-2 max-h-60 overflow-y-auto">{platformTenders.map((tender) => <Card key={tender.id}><CardContent className="p-3"><div className="flex justify-between items-start"><span className="text-xs text-muted-foreground">№ {tender.purchase_number}</span><Badge variant="outline">{tender.status}</Badge></div><div className="text-sm mt-1">{tender.subject}</div><div className="flex justify-between items-center mt-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{tender.customer || "—"}</span><span className="font-medium text-foreground">{formatMoney(tender.nmck)}</span></div></CardContent></Card>)}</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Modal component
interface PlatformModalProps {
  platform: Platform | null;
  onSave: (input: PlatformInput) => Promise<void>;
  onClose: () => void;
  isLoading: boolean;
}

function PlatformModal({ platform, onSave, onClose, isLoading }: PlatformModalProps) {
  const [formData, setFormData] = useState<PlatformInput>({
    name: platform?.name || "",
    short_name: platform?.short_name || "",
    url: platform?.url || "",
    description: platform?.description || "",
    is_active: platform?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    await onSave(formData);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{platform ? "Редактировать площадку" : "Добавить площадку"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Название *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Например: ЕИС, Сбербанк-АСТ" required /></div>
          <div className="space-y-2"><Label>Сокращённое название</Label><Input value={formData.short_name || ""} onChange={(e) => setFormData({ ...formData, short_name: e.target.value })} placeholder="Например: ЕИС" /></div>
          <div className="space-y-2"><Label>URL</Label><Input type="url" value={formData.url || ""} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://zakupki.gov.ru" /></div>
          <div className="space-y-2"><Label>Описание</Label><Textarea value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Описание площадки..." rows={3} /></div>
          <label className="flex items-center gap-2 cursor-pointer"><Checkbox checked={formData.is_active} onCheckedChange={(c) => setFormData({ ...formData, is_active: !!c })} /><span className="text-sm">Активна</span></label>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Отмена</Button><Button type="submit" disabled={isLoading}>{isLoading ? "Сохранение..." : "Сохранить"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
