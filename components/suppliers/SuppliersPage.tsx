"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Star,
  Building2,
  Tag,
  Filter,
  X,
  Download,
  CheckSquare,
  XSquare,
  Link2,
  Loader2,
} from "lucide-react";
import {
  Supplier,
  SupplierCategory,
  SupplierStatus,
  SUPPLIER_STATUSES,
  formatPhoneNumber,
} from "@/lib/suppliers/types";
import { SupplierForm } from "./SupplierForm";
import {
  deleteSupplier,
  bulkUpdateSupplierStatus,
  bulkUpdateSupplierCategory,
  bulkDeleteSuppliers,
  bulkSyncWithAccounting,
} from "@/lib/suppliers/service";
import { exportSuppliers } from "@/lib/suppliers/export";
import { useRouter } from "next/navigation";

interface SuppliersPageProps {
  suppliers: Supplier[];
  categories: SupplierCategory[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    blacklisted: number;
    withTenders: number;
  };
}

export function SuppliersPage({ suppliers, categories, stats }: SuppliersPageProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      // Поиск
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          supplier.name.toLowerCase().includes(searchLower) ||
          supplier.short_name?.toLowerCase().includes(searchLower) ||
          supplier.inn?.includes(search) ||
          supplier.phone?.includes(search) ||
          supplier.email?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Фильтр по категории
      if (categoryFilter !== "all" && supplier.category_id !== categoryFilter) {
        return false;
      }

      // Фильтр по статусу
      if (statusFilter !== "all" && supplier.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [suppliers, search, categoryFilter, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить поставщика?")) return;

    const success = await deleteSupplier(id);
    if (success) {
      router.refresh();
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingSupplier(null);
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  const hasFilters = search || categoryFilter !== "all" || statusFilter !== "all";
  const hasSelection = selectedIds.size > 0;

  // Выбор поставщиков
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredSuppliers.map((s) => s.id)));
  }, [filteredSuppliers]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Массовые операции
  const handleBulkStatus = async (status: "active" | "inactive" | "blacklisted") => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkUpdateSupplierStatus(Array.from(selectedIds), status);
      if (result.success) {
        clearSelection();
        router.refresh();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkCategory = async (categoryId: string | null) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkUpdateSupplierCategory(Array.from(selectedIds), categoryId);
      if (result.success) {
        clearSelection();
        router.refresh();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Удалить ${selectedIds.size} поставщиков?`)) return;
    setBulkLoading(true);
    try {
      const result = await bulkDeleteSuppliers(Array.from(selectedIds));
      if (result.success) {
        clearSelection();
        router.refresh();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkSync = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkSyncWithAccounting(Array.from(selectedIds));
      alert(`Синхронизировано: ${result.synced}, ошибок: ${result.errors}`);
      if (result.synced > 0) {
        router.refresh();
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExport = async () => {
    setBulkLoading(true);
    try {
      const result = await exportSuppliers({
        format: "csv",
        includeContacts: true,
        categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (result.success && result.data) {
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `suppliers_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const getStatusBadge = (status: SupplierStatus) => {
    const info = SUPPLIER_STATUSES[status];
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      green: "default",
      gray: "secondary",
      red: "destructive",
    };
    return (
      <Badge variant={variants[info.color] || "secondary"}>
        {info.name}
      </Badge>
    );
  };

  const renderRating = (rating?: number) => {
    if (!rating) return <span className="text-gray-400">—</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Всего</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">Неактивных</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Building2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.blacklisted}</p>
                <p className="text-xs text-muted-foreground">В ЧС</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withTenders}</p>
                <p className="text-xs text-muted-foreground">С тендерами</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Поставщики</h1>
          <p className="text-muted-foreground">
            Управление базой поставщиков и контактами
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={bulkLoading}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Экспорт</span>
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Добавить</span>
            <span className="sm:hidden">+</span>
          </Button>
        </div>
      </div>

      {/* Панель массовых операций */}
      {hasSelection && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <CheckSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  Выбрано: {selectedIds.size}
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <XSquare className="h-4 w-4" />
                </Button>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkLoading}>
                    Статус
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkStatus("active")}>
                    Активный
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatus("inactive")}>
                    Неактивный
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatus("blacklisted")}>
                    В чёрный список
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={bulkLoading}>
                    Категория
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkCategory(null)}>
                    Без категории
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {categories.map((cat) => (
                    <DropdownMenuItem
                      key={cat.id}
                      onClick={() => handleBulkCategory(cat.id)}
                    >
                      {cat.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSync}
                disabled={bulkLoading}
              >
                <Link2 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Синхронизировать</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Удалить</span>
              </Button>

              {bulkLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, ИНН, телефону..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(SUPPLIER_STATUSES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Таблица поставщиков */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Список поставщиков
            {hasFilters && (
              <Badge variant="secondary" className="ml-2">
                Найдено: {filteredSuppliers.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Поставщики не найдены</h3>
              <p className="text-muted-foreground mt-1">
                {hasFilters
                  ? "Попробуйте изменить параметры поиска"
                  : "Добавьте первого поставщика"}
              </p>
              {!hasFilters && (
                <Button onClick={() => setFormOpen(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить поставщика
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedIds.size === filteredSuppliers.length && filteredSuppliers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) selectAll();
                        else clearSelection();
                      }}
                    />
                  </TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead className="hidden md:table-cell">Категория</TableHead>
                  <TableHead className="hidden lg:table-cell">Контакты</TableHead>
                  <TableHead className="hidden sm:table-cell">Рейтинг</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className={selectedIds.has(supplier.id) ? "bg-blue-50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(supplier.id)}
                        onCheckedChange={() => toggleSelect(supplier.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/tenders/suppliers/${supplier.id}`}
                        className="hover:underline"
                      >
                        <div className="font-medium">{supplier.name}</div>
                        {supplier.inn && (
                          <div className="text-sm text-muted-foreground">
                            ИНН: {supplier.inn}
                          </div>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {supplier.category ? (
                        <Badge
                          variant="outline"
                          style={{ borderColor: supplier.category.color }}
                        >
                          {supplier.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {formatPhoneNumber(supplier.phone)}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {supplier.email}
                          </div>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{renderRating(supplier.rating)}</TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/tenders/suppliers/${supplier.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Открыть
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(supplier.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Форма создания/редактирования */}
      <SupplierForm
        open={formOpen}
        onOpenChange={handleFormClose}
        supplier={editingSupplier}
        categories={categories}
      />
    </div>
  );
}
