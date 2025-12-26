"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getProductItems,
  createProductItem,
  updateProductItem,
  permanentDeleteProductItem,
} from "@/lib/product-items/service";
import type { ProductItem, ProductItemInput } from "@/types/product-item";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Plus, Search, X, ShoppingCart, SearchX, Pencil, Trash2, Loader2, TrendingUp, TrendingDown } from "lucide-react";

type Category = {
  id: string;
  name: string;
  kind: string;
};

export function ProductItemsManager() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState<ProductItemInput>({
    name: "",
    default_unit: "шт",
    default_price_per_unit: null,
    category_id: null,
    category_type: null,
    description: "",
  });
  
  const [uncategorizedId, setUncategorizedId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, kind")
        .in("kind", ["income", "expense", "both"])
        .order("kind", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      
      const uncategorized = data?.find(cat => cat.name === "Без категории");
      if (uncategorized) {
        setUncategorizedId(uncategorized.id);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProductItems(false);
      setItems(data);
    } catch (error) {
      console.error("Error loading product items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadCategories();
  }, [loadItems, loadCategories]);

  const incomeCategories = categories.filter((cat) => cat.kind === "income" || cat.kind === "both");
  const expenseCategories = categories.filter((cat) => cat.kind === "expense" || cat.kind === "both");

  // Функция фильтрации товаров по поисковому запросу
  const filterItems = (itemsList: ProductItem[]) => {
    if (!searchQuery.trim()) return itemsList;
    
    const query = searchQuery.toLowerCase().trim();
    return itemsList.filter(item => {
      // Поиск по названию товара
      if (item.name.toLowerCase().includes(query)) return true;
      
      // Поиск по описанию
      if (item.description && item.description.toLowerCase().includes(query)) return true;
      
      // Поиск по категории
      const category = categories.find(c => c.id === item.category_id);
      if (category && category.name.toLowerCase().includes(query)) return true;
      
      return false;
    });
  };


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Валидация обязательных полей
    if (!formData.name.trim()) {
      alert("Название товара обязательно");
      return;
    }
    
    if (!formData.default_unit.trim()) {
      alert("Единица измерения обязательна");
      return;
    }
    
    if (!formData.category_id) {
      alert("Необходимо выбрать категорию");
      return;
    }
    
    // Проверка уникальности названия
    const trimmedName = formData.name.trim().toLowerCase();
    const duplicateItem = items.find(
      item => item.name.toLowerCase() === trimmedName && item.id !== editingId
    );
    
    if (duplicateItem) {
      alert(`Товар с названием "${formData.name}" уже существует`);
      return;
    }
    
    try {
      if (editingId) {
        await updateProductItem({ id: editingId, ...formData });
      } else {
        await createProductItem(formData);
      }
      
      await loadItems();
      resetForm();
    } catch (error) {
      console.error("Error saving product item:", error);
      alert("Ошибка при сохранении товара");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Вы уверены, что хотите удалить этот товар?")) {
      return;
    }
    
    try {
      await permanentDeleteProductItem(id);
      await loadItems();
    } catch (error) {
      console.error("Error deleting product item:", error);
      const errorMessage = error instanceof Error ? error.message : "Ошибка при удалении товара";
      alert(errorMessage);
    }
  }

  async function handleToggleStatus(item: ProductItem) {
    try {
      await updateProductItem({ id: item.id, is_active: !item.is_active });
      await loadItems();
    } catch (error) {
      console.error("Error toggling product item status:", error);
      const errorMessage = error instanceof Error ? error.message : "Не удалось изменить статус товара";
      alert(errorMessage);
    }
  }

  function handleEdit(item: ProductItem) {
    setEditingId(item.id);
    
    setFormData({
      name: item.name,
      default_unit: item.default_unit,
      default_price_per_unit: item.default_price_per_unit,
      category_id: item.category_id || null,
      category_type: item.category_type || null,
      description: item.description || "",
    });
    setShowAddForm(true);
  }

  function resetForm() {
    setFormData({
      name: "",
      default_unit: "шт",
      default_price_per_unit: null,
      category_id: uncategorizedId,
      category_type: null,
      description: "",
    });
    setEditingId(null);
    setShowAddForm(false);
  }

  const formatPrice = (priceMinor: number | null) => {
    if (priceMinor === null) return "—";
    return `${(priceMinor / 100).toFixed(2)} ₽`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin mr-2" />Загрузка...</div>;
  }

  // Функция рендера таблицы товаров
  const renderItemsTable = (itemsList: ProductItem[]) => (
    <Table>
      <TableHeader>
        <TableRow><TableHead>Название</TableHead><TableHead>Ед.</TableHead><TableHead>Цена</TableHead><TableHead>Категория</TableHead><TableHead>Статус</TableHead><TableHead>Действия</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {itemsList.map((item) => (
          <TableRow key={item.id} className={cn(!item.is_active && "opacity-50")}>
            <TableCell>
              <div><span className="font-medium">{item.name}</span>{item.description && <span className="block text-xs text-muted-foreground">{item.description}</span>}</div>
            </TableCell>
            <TableCell>{item.default_unit}</TableCell>
            <TableCell>{formatPrice(item.default_price_per_unit)}</TableCell>
            <TableCell>{item.category_id ? categories.find(c => c.id === item.category_id)?.name || "—" : "—"}</TableCell>
            <TableCell><span className={cn("px-2 py-0.5 rounded-full text-xs", item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{item.is_active ? "Активен" : "Неактивен"}</span></TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} title="Редактировать"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(item)} title={item.is_active ? "Деактивировать" : "Активировать"}>{item.is_active ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(item.id)} title="Удалить"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск товаров..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          {searchQuery && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchQuery("")}><X className="h-4 w-4" /></Button>}
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}><Plus className="h-4 w-4 mr-1" />Добавить товар</Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader><CardTitle>{editingId ? "Редактировать товар" : "Новый товар"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Название *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Например: Молоко" required /></div>
                <div className="space-y-2"><Label>Единица *</Label>
                  <Select value={formData.default_unit} onValueChange={(v) => setFormData({ ...formData, default_unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="шт">шт</SelectItem><SelectItem value="кг">кг</SelectItem><SelectItem value="л">л</SelectItem><SelectItem value="г">г</SelectItem><SelectItem value="мл">мл</SelectItem><SelectItem value="упак">упак</SelectItem><SelectItem value="м">м</SelectItem><SelectItem value="м²">м²</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Цена (₽)</Label><Input type="number" step="0.01" value={formData.default_price_per_unit ? formData.default_price_per_unit / 100 : ""} onChange={(e) => setFormData({ ...formData, default_price_per_unit: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} placeholder="0.00" /></div>
                <div className="space-y-2"><Label>Категория *</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.category_id && formData.category_type ? `${formData.category_id}|${formData.category_type}` : formData.category_id || ""} onChange={(e) => { const value = e.target.value; if (!value) { setFormData({ ...formData, category_id: null, category_type: null }); return; } const [categoryId, type] = value.split("|"); setFormData({ ...formData, category_id: categoryId, category_type: type ? (type as "income" | "expense") : null }); }} required>
                    <option value="">— выберите —</option>
                    {incomeCategories.length > 0 && <optgroup label="Доходы">{incomeCategories.map((cat) => <option key={`${cat.id}-income`} value={cat.kind === "both" ? `${cat.id}|income` : cat.id}>{cat.name}</option>)}</optgroup>}
                    {expenseCategories.length > 0 && <optgroup label="Расходы">{expenseCategories.map((cat) => <option key={`${cat.id}-expense`} value={cat.kind === "both" ? `${cat.id}|expense` : cat.id}>{cat.name}</option>)}</optgroup>}
                  </select>
                </div>
              </div>
              <div className="space-y-2"><Label>Описание</Label><Textarea value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value || null })} placeholder="Дополнительная информация" rows={2} /></div>
              <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={resetForm}>Отмена</Button><Button type="submit">{editingId ? "Сохранить" : "Добавить"}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><ShoppingCart className="h-12 w-12 mb-3 opacity-50" /><p>Нет добавленных товаров</p><p className="text-sm">Добавьте товары, которые вы часто покупаете</p></div>
      ) : (() => {
        const filteredItems = filterItems(items);
        if (filteredItems.length === 0 && searchQuery) {
          return <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><SearchX className="h-12 w-12 mb-3 opacity-50" /><p>Ничего не найдено</p><p className="text-sm">Попробуйте изменить поисковый запрос</p></div>;
        }
        const incomeItems = filterItems(items.filter(item => { const cat = categories.find(c => c.id === item.category_id); if (!cat) return false; return item.category_type === "income" || cat.kind === "income"; }));
        const expenseItems = filterItems(items.filter(item => { const cat = categories.find(c => c.id === item.category_id); if (!cat) return false; return item.category_type === "expense" || cat.kind === "expense"; }));
        return (
          <div className="space-y-6">
            {incomeItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-600" />Доходы ({incomeItems.length})</CardTitle></CardHeader>
                <CardContent className="p-0">{renderItemsTable(incomeItems)}</CardContent>
              </Card>
            )}
            {expenseItems.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-600" />Расходы ({expenseItems.length})</CardTitle></CardHeader>
                <CardContent className="p-0">{renderItemsTable(expenseItems)}</CardContent>
              </Card>
            )}
          </div>
        );
      })()}
    </div>
  );
}
