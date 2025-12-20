"use client";

import { useState, useMemo, useRef } from "react";
import { useVirtualizer, VirtualItem } from "@tanstack/react-virtual";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  Star,
  Phone,
  Mail,
  Building2,
  Edit,
  Trash2,
  Eye,
  Ban,
  CheckCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Supplier, SupplierCategory, SUPPLIER_STATUSES } from "@/lib/suppliers/types";

interface SuppliersVirtualTableProps {
  suppliers: Supplier[];
  categories: SupplierCategory[];
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (supplier: Supplier) => void;
  onView?: (supplier: Supplier) => void;
  onStatusChange?: (supplier: Supplier, status: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

type SortField = "name" | "rating" | "status" | "category" | "created_at";
type SortDirection = "asc" | "desc";

const ROW_HEIGHT = 72;

export function SuppliersVirtualTable({
  suppliers,
  categories,
  onEdit,
  onDelete,
  onView,
  onStatusChange,
  selectedIds = new Set(),
  onSelectionChange,
}: SuppliersVirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Фильтрация
  const filteredSuppliers = useMemo(() => {
    let result = [...suppliers];

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.short_name?.toLowerCase().includes(query) ||
          s.inn?.includes(query) ||
          s.phone?.includes(query) ||
          s.email?.toLowerCase().includes(query)
      );
    }

    // Сортировка
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name, "ru");
          break;
        case "rating":
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "category":
          const catA = categories.find((c) => c.id === a.category_id)?.name || "";
          const catB = categories.find((c) => c.id === b.category_id)?.name || "";
          comparison = catA.localeCompare(catB, "ru");
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [suppliers, searchQuery, sortField, sortDirection, categories]);

  const virtualizer = useVirtualizer({
    count: filteredSuppliers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedIds.size === filteredSuppliers.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filteredSuppliers.map((s) => s.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    if (!onSelectionChange) return;

    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId);
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, ИНН, телефону, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredSuppliers.length} из {suppliers.length}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {/* Заголовок таблицы */}
        <div className="sticky top-0 bg-muted/50 border-b px-4 py-2 flex items-center gap-4 text-sm font-medium text-muted-foreground z-10">
          {onSelectionChange && (
            <div className="w-8">
              <Checkbox
                checked={selectedIds.size === filteredSuppliers.length && filteredSuppliers.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <SortButton field="name">Поставщик</SortButton>
          </div>
          <div className="w-32">
            <SortButton field="category">Категория</SortButton>
          </div>
          <div className="w-28">
            <SortButton field="status">Статус</SortButton>
          </div>
          <div className="w-20 text-center">
            <SortButton field="rating">Рейтинг</SortButton>
          </div>
          <div className="w-40">Контакты</div>
          <div className="w-10"></div>
        </div>

        {/* Виртуализированный список */}
        <div ref={parentRef} className="h-[calc(100vh-300px)] overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
              const supplier = filteredSuppliers[virtualRow.index];
              const category = getCategoryName(supplier.category_id);
              const isSelected = selectedIds.has(supplier.id);

              return (
                <div
                  key={supplier.id}
                  className={`absolute top-0 left-0 w-full flex items-center gap-4 px-4 border-b hover:bg-muted/30 transition-colors ${
                    isSelected ? "bg-primary/5" : ""
                  }`}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {onSelectionChange && (
                    <div className="w-8">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleSelectOne(supplier.id)}
                      />
                    </div>
                  )}

                  {/* Поставщик */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{supplier.short_name || supplier.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {supplier.inn && `ИНН ${supplier.inn}`}
                          {supplier.inn && supplier.kpp && " • "}
                          {supplier.kpp && `КПП ${supplier.kpp}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Категория */}
                  <div className="w-32">
                    {category ? (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: category.color || undefined,
                          color: category.color || undefined,
                        }}
                      >
                        {category.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </div>

                  {/* Статус */}
                  <div className="w-28">
                    <Badge
                      variant={
                        supplier.status === "active"
                          ? "default"
                          : supplier.status === "blacklisted"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {SUPPLIER_STATUSES[supplier.status as keyof typeof SUPPLIER_STATUSES]?.name ||
                        supplier.status}
                    </Badge>
                  </div>

                  {/* Рейтинг */}
                  <div className="w-20 text-center">
                    {supplier.rating ? (
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{supplier.rating}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Контакты */}
                  <div className="w-40 space-y-0.5">
                    {supplier.phone && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Действия */}
                  <div className="w-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(supplier)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Просмотр
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(supplier)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {onStatusChange && supplier.status !== "active" && (
                          <DropdownMenuItem onClick={() => onStatusChange(supplier, "active")}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Активировать
                          </DropdownMenuItem>
                        )}
                        {onStatusChange && supplier.status !== "blacklisted" && (
                          <DropdownMenuItem
                            onClick={() => onStatusChange(supplier, "blacklisted")}
                            className="text-red-600"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            В чёрный список
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={() => onDelete(supplier)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
