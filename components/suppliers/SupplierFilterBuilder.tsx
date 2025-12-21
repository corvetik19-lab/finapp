"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Filter,
  X,
  Plus,
  Save,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Star,
  Building2,
  Tag,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { SupplierCategory, SUPPLIER_STATUSES } from "@/lib/suppliers/types";

// =====================================================
// Типы фильтров
// =====================================================

export interface SupplierFilters {
  search?: string;
  categoryIds?: string[];
  statuses?: string[];
  ratingMin?: number;
  ratingMax?: number;
  hasTenders?: boolean;
  tenderWinsMin?: number;
  cities?: string[];
  regions?: string[];
  tags?: string[];
  createdFrom?: Date;
  createdTo?: Date;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasInn?: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: SupplierFilters;
  isDefault?: boolean;
  isShared?: boolean;
}

interface SupplierFilterBuilderProps {
  categories: SupplierCategory[];
  filters: SupplierFilters;
  onChange: (filters: SupplierFilters) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, filters: SupplierFilters) => void;
  onDeleteFilter?: (id: string) => void;
  onApplySavedFilter?: (filter: SavedFilter) => void;
}

export function SupplierFilterBuilder({
  categories,
  filters,
  onChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  onApplySavedFilter,
}: SupplierFilterBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const activeFiltersCount = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== null && 
    (Array.isArray(value) ? value.length > 0 : true)
  ).length;

  const updateFilter = useCallback(<K extends keyof SupplierFilters>(
    key: K,
    value: SupplierFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  }, [filters, onChange]);

  const clearFilters = useCallback(() => {
    onChange({});
  }, [onChange]);

  const handleSaveFilter = useCallback(() => {
    if (newFilterName.trim() && onSaveFilter) {
      onSaveFilter(newFilterName.trim(), filters);
      setNewFilterName("");
      setShowSaveDialog(false);
    }
  }, [newFilterName, filters, onSaveFilter]);

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Фильтры</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Быстрые фильтры (пресеты) */}
          {savedFilters.length > 0 && (
            <div className="space-y-2">
              <Label>Сохранённые фильтры</Label>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map((saved) => (
                  <Badge
                    key={saved.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent gap-1"
                    onClick={() => onApplySavedFilter?.(saved)}
                  >
                    {saved.name}
                    {saved.isDefault && <Star className="h-3 w-3" />}
                    {onDeleteFilter && (
                      <X
                        className="h-3 w-3 ml-1 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFilter(saved.id);
                        }}
                      />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Категории */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Категории
            </Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = filters.categoryIds?.includes(category.id);
                return (
                  <Badge
                    key={category.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = filters.categoryIds || [];
                      updateFilter(
                        "categoryIds",
                        isSelected
                          ? current.filter((id) => id !== category.id)
                          : [...current, category.id]
                      );
                    }}
                  >
                    {category.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Статусы */}
          <div className="space-y-2">
            <Label>Статус</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SUPPLIER_STATUSES).map(([key, { name }]) => {
                const isSelected = filters.statuses?.includes(key);
                return (
                  <Badge
                    key={key}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const current = filters.statuses || [];
                      updateFilter(
                        "statuses",
                        isSelected
                          ? current.filter((s) => s !== key)
                          : [...current, key]
                      );
                    }}
                  >
                    {name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Рейтинг */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Рейтинг: {filters.ratingMin || 0} - {filters.ratingMax || 5}
            </Label>
            <Slider
              min={0}
              max={5}
              step={0.5}
              value={[filters.ratingMin || 0, filters.ratingMax || 5]}
              onValueChange={([min, max]: number[]) => {
                updateFilter("ratingMin", min);
                updateFilter("ratingMax", max);
              }}
              className="py-2"
            />
          </div>

          {/* Теги */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Теги
            </Label>
            <Input
              placeholder="Введите теги через запятую"
              value={filters.tags?.join(", ") || ""}
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                updateFilter("tags", tags.length > 0 ? tags : undefined);
              }}
            />
          </div>

          {/* География */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Город
              </Label>
              <Input
                placeholder="Москва, Санкт-Петербург..."
                value={filters.cities?.join(", ") || ""}
                onChange={(e) => {
                  const cities = e.target.value
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean);
                  updateFilter("cities", cities.length > 0 ? cities : undefined);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Регион</Label>
              <Input
                placeholder="Московская область..."
                value={filters.regions?.join(", ") || ""}
                onChange={(e) => {
                  const regions = e.target.value
                    .split(",")
                    .map((r) => r.trim())
                    .filter(Boolean);
                  updateFilter("regions", regions.length > 0 ? regions : undefined);
                }}
              />
            </div>
          </div>

          {/* Дата добавления */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Добавлен с</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {filters.createdFrom
                      ? format(filters.createdFrom, "dd.MM.yyyy", { locale: ru })
                      : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.createdFrom}
                    onSelect={(date) => updateFilter("createdFrom", date)}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Добавлен по</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {filters.createdTo
                      ? format(filters.createdTo, "dd.MM.yyyy", { locale: ru })
                      : "Выберите дату"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.createdTo}
                    onSelect={(date) => updateFilter("createdTo", date)}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Тендеры */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasTenders"
                  checked={filters.hasTenders === true}
                  onCheckedChange={(checked) =>
                    updateFilter("hasTenders", checked ? true : undefined)
                  }
                />
                <Label htmlFor="hasTenders">Участвовал в тендерах</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Побед от:</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={filters.tenderWinsMin || ""}
                  onChange={(e) =>
                    updateFilter(
                      "tenderWinsMin",
                      e.target.value ? parseInt(e.target.value, 10) : undefined
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Контактные данные */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPhone"
                checked={filters.hasPhone === true}
                onCheckedChange={(checked) =>
                  updateFilter("hasPhone", checked ? true : undefined)
                }
              />
              <Label htmlFor="hasPhone">Есть телефон</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasEmail"
                checked={filters.hasEmail === true}
                onCheckedChange={(checked) =>
                  updateFilter("hasEmail", checked ? true : undefined)
                }
              />
              <Label htmlFor="hasEmail">Есть email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasInn"
                checked={filters.hasInn === true}
                onCheckedChange={(checked) =>
                  updateFilter("hasInn", checked ? true : undefined)
                }
              />
              <Label htmlFor="hasInn">Есть ИНН</Label>
            </div>
          </div>

          {/* Сохранение фильтра */}
          {onSaveFilter && (
            <div className="pt-4 border-t">
              {showSaveDialog ? (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Название фильтра"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveFilter()}
                  />
                  <Button onClick={handleSaveFilter} disabled={!newFilterName.trim()}>
                    <Save className="h-4 w-4 mr-1" />
                    Сохранить
                  </Button>
                  <Button variant="ghost" onClick={() => setShowSaveDialog(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={activeFiltersCount === 0}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Сохранить фильтр
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
