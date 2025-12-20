"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Filter,
  X,
  Save,
  Bookmark,
  Trash2,
  ChevronDown,
  Star,
} from "lucide-react";
import { SupplierCategory, SUPPLIER_STATUSES } from "@/lib/suppliers/types";

export interface SupplierFilters {
  search?: string;
  categoryIds?: string[];
  statuses?: string[];
  minRating?: number;
  maxRating?: number;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasInn?: boolean;
  tags?: string[];
  region?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: SupplierFilters;
  isDefault?: boolean;
  isShared?: boolean;
}

interface SuppliersAdvancedFiltersProps {
  categories: SupplierCategory[];
  filters: SupplierFilters;
  onFiltersChange: (filters: SupplierFilters) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: SupplierFilters) => void;
  onDeleteFilter?: (id: string) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  availableTags?: string[];
}

export function SuppliersAdvancedFilters({
  categories,
  filters,
  onFiltersChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  onLoadFilter,
  availableTags = [],
}: SuppliersAdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

  const activeFiltersCount = countActiveFilters(filters);

  const handleChange = <K extends keyof SupplierFilters>(
    key: K,
    value: SupplierFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const current = filters.categoryIds || [];
    const updated = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];
    handleChange("categoryIds", updated.length > 0 ? updated : undefined);
  };

  const handleStatusToggle = (status: string) => {
    const current = filters.statuses || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    handleChange("statuses", updated.length > 0 ? updated : undefined);
  };

  const handleTagToggle = (tag: string) => {
    const current = filters.tags || [];
    const updated = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    handleChange("tags", updated.length > 0 ? updated : undefined);
  };

  const handleClearAll = () => {
    onFiltersChange({});
  };

  const handleSaveFilter = () => {
    if (filterName.trim() && onSaveFilter) {
      onSaveFilter(filterName.trim(), filters);
      setFilterName("");
      setSaveDialogOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Быстрый поиск */}
      <Input
        placeholder="Поиск..."
        value={filters.search || ""}
        onChange={(e) => handleChange("search", e.target.value || undefined)}
        className="w-64"
      />

      {/* Кнопка фильтров */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Фильтры
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4" align="start">
          <div className="space-y-4">
            {/* Категории */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Категории</Label>
              <div className="flex flex-wrap gap-1">
                {categories.map((category) => {
                  const isActive = filters.categoryIds?.includes(category.id);
                  return (
                    <Badge
                      key={category.id}
                      variant={isActive ? "default" : "outline"}
                      className="cursor-pointer"
                      style={
                        isActive
                          ? { backgroundColor: category.color || undefined }
                          : { borderColor: category.color || undefined, color: category.color || undefined }
                      }
                      onClick={() => handleCategoryToggle(category.id)}
                    >
                      {category.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Статусы */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Статус</Label>
              <div className="flex flex-wrap gap-1">
                {Object.entries(SUPPLIER_STATUSES).map(([key, label]) => {
                  const isActive = filters.statuses?.includes(key);
                  return (
                    <Badge
                      key={key}
                      variant={isActive ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleStatusToggle(key)}
                    >
                      {label.name}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Рейтинг */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Рейтинг</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={String(filters.minRating || "")}
                  onValueChange={(v) =>
                    handleChange("minRating", v ? parseInt(v) : undefined)
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="От" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Любой</SelectItem>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} <Star className="h-3 w-3 inline ml-1" />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">—</span>
                <Select
                  value={String(filters.maxRating || "")}
                  onValueChange={(v) =>
                    handleChange("maxRating", v ? parseInt(v) : undefined)
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="До" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Любой</SelectItem>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} <Star className="h-3 w-3 inline ml-1" />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Наличие данных */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Наличие данных</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasPhone"
                    checked={filters.hasPhone || false}
                    onCheckedChange={(checked) =>
                      handleChange("hasPhone", checked ? true : undefined)
                    }
                  />
                  <Label htmlFor="hasPhone" className="text-sm">Телефон</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasEmail"
                    checked={filters.hasEmail || false}
                    onCheckedChange={(checked) =>
                      handleChange("hasEmail", checked ? true : undefined)
                    }
                  />
                  <Label htmlFor="hasEmail" className="text-sm">Email</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hasInn"
                    checked={filters.hasInn || false}
                    onCheckedChange={(checked) =>
                      handleChange("hasInn", checked ? true : undefined)
                    }
                  />
                  <Label htmlFor="hasInn" className="text-sm">ИНН</Label>
                </div>
              </div>
            </div>

            {/* Теги */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Теги</Label>
                <div className="flex flex-wrap gap-1">
                  {availableTags.slice(0, 10).map((tag) => {
                    const isActive = filters.tags?.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isActive ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Дата создания */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Дата добавления</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={filters.createdAfter || ""}
                  onChange={(e) =>
                    handleChange("createdAfter", e.target.value || undefined)
                  }
                  className="flex-1"
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="date"
                  value={filters.createdBefore || ""}
                  onChange={(e) =>
                    handleChange("createdBefore", e.target.value || undefined)
                  }
                  className="flex-1"
                />
              </div>
            </div>

            {/* Действия */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
              {onSaveFilter && (
                <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(true)}>
                  <Save className="h-4 w-4 mr-1" />
                  Сохранить
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Сохранённые фильтры */}
      {savedFilters.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon">
              <Bookmark className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-1">
              <p className="text-sm font-medium mb-2">Сохранённые фильтры</p>
              {savedFilters.map((saved) => (
                <div
                  key={saved.id}
                  className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted"
                >
                  <button
                    className="flex-1 text-left text-sm"
                    onClick={() => onLoadFilter?.(saved)}
                  >
                    {saved.name}
                    {saved.isDefault && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        По умолчанию
                      </Badge>
                    )}
                  </button>
                  {onDeleteFilter && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onDeleteFilter(saved.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Активные фильтры */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1 ml-2">
          {filters.categoryIds?.map((id) => {
            const cat = categories.find((c) => c.id === id);
            return cat ? (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1"
                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
              >
                {cat.name}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleCategoryToggle(id)}
                />
              </Badge>
            ) : null;
          })}
          {filters.statuses?.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {SUPPLIER_STATUSES[status as keyof typeof SUPPLIER_STATUSES]?.name}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusToggle(status)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Диалог сохранения */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сохранить фильтр</DialogTitle>
            <DialogDescription>
              Сохраните текущие настройки фильтров для быстрого доступа
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Название фильтра</Label>
              <Input
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Например: Активные поставщики материалов"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function countActiveFilters(filters: SupplierFilters): number {
  let count = 0;
  if (filters.categoryIds?.length) count++;
  if (filters.statuses?.length) count++;
  if (filters.minRating || filters.maxRating) count++;
  if (filters.hasPhone) count++;
  if (filters.hasEmail) count++;
  if (filters.hasInn) count++;
  if (filters.tags?.length) count++;
  if (filters.createdAfter || filters.createdBefore) count++;
  return count;
}
