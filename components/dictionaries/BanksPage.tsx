"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bank, BankInput, BankFilters } from "@/types/bank";
import {
  createBank,
  updateBank,
  deleteBank,
  toggleBankActive,
} from "@/lib/dictionaries/banks-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Landmark,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Globe,
  Phone,
  MapPin,
  Copy,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast/ToastContext";

interface BanksPageProps {
  initialBanks: Bank[];
  stats: {
    total: number;
    active: number;
  };
}

const emptyBankInput: BankInput = {
  name: "",
  short_name: "",
  bik: "",
  correspondent_account: "",
  swift: "",
  address: "",
  phone: "",
  website: "",
  is_active: true,
  notes: "",
};

export default function BanksPage({ initialBanks, stats }: BanksPageProps) {
  const router = useRouter();
  const toast = useToast();
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [filters, setFilters] = useState<BankFilters>({
    search: "",
    is_active: "all",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState<BankInput>(emptyBankInput);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<Bank | null>(null);

  // Фильтрация
  const filteredBanks = banks.filter((b) => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchName = b.name.toLowerCase().includes(search);
      const matchShortName = b.short_name?.toLowerCase().includes(search);
      const matchBik = b.bik?.toLowerCase().includes(search);
      if (!matchName && !matchShortName && !matchBik) return false;
    }
    if (filters.is_active !== "all" && b.is_active !== filters.is_active) return false;
    return true;
  });

  // Открыть модалку для создания
  const handleCreate = () => {
    setEditingBank(null);
    setFormData(emptyBankInput);
    setIsModalOpen(true);
  };

  // Открыть модалку для редактирования
  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      short_name: bank.short_name || "",
      bik: bank.bik,
      correspondent_account: bank.correspondent_account || "",
      swift: bank.swift || "",
      address: bank.address || "",
      phone: bank.phone || "",
      website: bank.website || "",
      is_active: bank.is_active,
      notes: bank.notes || "",
    });
    setIsModalOpen(true);
  };

  // Сохранить банк
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.show("Введите название банка", { type: "error" });
      return;
    }
    if (!formData.bik.trim()) {
      toast.show("Введите БИК", { type: "error" });
      return;
    }
    if (formData.bik.length !== 9) {
      toast.show("БИК должен содержать 9 цифр", { type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      if (editingBank) {
        const result = await updateBank(editingBank.id, formData);
        if (result.success && result.data) {
          setBanks((prev) =>
            prev.map((b) => (b.id === editingBank.id ? result.data! : b))
          );
          toast.show("Банк обновлён", { type: "success" });
        } else {
          toast.show(result.error || "Ошибка обновления", { type: "error" });
          return;
        }
      } else {
        const result = await createBank(formData);
        if (result.success && result.data) {
          setBanks((prev) => [...prev, result.data!]);
          toast.show("Банк добавлен", { type: "success" });
        } else {
          toast.show(result.error || "Ошибка создания", { type: "error" });
          return;
        }
      }
      setIsModalOpen(false);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // Удалить банк
  const handleDelete = async () => {
    if (!bankToDelete) return;

    setIsLoading(true);
    try {
      const result = await deleteBank(bankToDelete.id);
      if (result.success) {
        setBanks((prev) => prev.filter((b) => b.id !== bankToDelete.id));
        toast.show("Банк удалён", { type: "success" });
        router.refresh();
      } else {
        toast.show(result.error || "Ошибка удаления", { type: "error" });
      }
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setBankToDelete(null);
    }
  };

  // Переключить активность
  const handleToggleActive = async (bank: Bank) => {
    setIsLoading(true);
    try {
      const result = await toggleBankActive(bank.id);
      if (result.success) {
        setBanks((prev) =>
          prev.map((b) => (b.id === bank.id ? { ...b, is_active: !b.is_active } : b))
        );
        toast.show("Статус изменён", { type: "success" });
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Копировать в буфер
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.show(`${label} скопирован`, { type: "success" });
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Банки</h1>
          <p className="text-muted-foreground">
            Справочник банков для банковских гарантий и платежей
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить банк
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего банков</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Неактивных</CardTitle>
            <XCircle className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {stats.total - stats.active}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или БИК..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
            <Select
              value={String(filters.is_active)}
              onValueChange={(v) =>
                setFilters({
                  ...filters,
                  is_active: v === "all" ? "all" : v === "true",
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="true">Активные</SelectItem>
                <SelectItem value="false">Неактивные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>БИК</TableHead>
                <TableHead>Корр. счёт</TableHead>
                <TableHead>SWIFT</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBanks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Landmark className="h-8 w-8" />
                      <p>Банки не найдены</p>
                      {filters.search && (
                        <Button
                          variant="link"
                          onClick={() => setFilters({ ...filters, search: "" })}
                        >
                          Сбросить фильтры
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBanks.map((bank) => (
                  <TableRow key={bank.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{bank.name}</span>
                        {bank.short_name && (
                          <span className="text-sm text-muted-foreground">
                            {bank.short_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {bank.bik}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(bank.bik, "БИК")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {bank.correspondent_account ? (
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {bank.correspondent_account}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              copyToClipboard(bank.correspondent_account!, "Корр. счёт")
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {bank.swift ? (
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                          {bank.swift}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={bank.is_active ? "default" : "secondary"}
                        className={cn(
                          bank.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-100"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {bank.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(bank)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(bank)}>
                            {bank.is_active ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Деактивировать
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Активировать
                              </>
                            )}
                          </DropdownMenuItem>
                          {bank.website && (
                            <DropdownMenuItem asChild>
                              <a
                                href={bank.website}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Открыть сайт
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setBankToDelete(bank);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Модалка создания/редактирования */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingBank ? "Редактировать банк" : "Добавить банк"}
            </DialogTitle>
            <DialogDescription>
              Заполните реквизиты банка для использования в документах
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Название <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="ПАО Сбербанк"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="short_name">Краткое название</Label>
                <Input
                  id="short_name"
                  placeholder="Сбербанк"
                  value={formData.short_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, short_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bik">
                  БИК <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bik"
                  placeholder="044525225"
                  maxLength={9}
                  value={formData.bik}
                  onChange={(e) =>
                    setFormData({ ...formData, bik: e.target.value.replace(/\D/g, "") })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correspondent_account">Корреспондентский счёт</Label>
                <Input
                  id="correspondent_account"
                  placeholder="30101810400000000225"
                  maxLength={20}
                  value={formData.correspondent_account || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      correspondent_account: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="swift">SWIFT</Label>
                <Input
                  id="swift"
                  placeholder="SABRRUMM"
                  maxLength={11}
                  value={formData.swift || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, swift: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+7 (495) 500-55-50"
                    className="pl-9"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="website">Сайт</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="website"
                    placeholder="https://sberbank.ru"
                    className="pl-9"
                    value={formData.website || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Активен</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  placeholder="117997, г. Москва, ул. Вавилова, д. 19"
                  className="pl-9"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                placeholder="Дополнительная информация..."
                rows={3}
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBank ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить банк?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить банк &quot;{bankToDelete?.name}&quot;? Это
              действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
