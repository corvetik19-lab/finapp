"use client";

import { useState, useEffect } from "react";
import { getQuickPresets, createQuickPreset, updateQuickPreset, deleteQuickPreset } from "@/lib/quick-presets/service";
import type { QuickTransactionPreset, QuickPresetInput } from "@/types/quick-preset";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
  kind: string;
};

type Account = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  name: string;
  default_price_per_unit: number | null;
  category_id: string | null;
  category_type: "income" | "expense" | "both" | null;
};

export function QuickPresetsManager() {
  const [presets, setPresets] = useState<QuickTransactionPreset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  
  const [formData, setFormData] = useState<QuickPresetInput>({
    name: "",
    amount: 0,
    direction: "expense",
    category_id: null,
    account_id: null,
    sort_order: 0,
  });

  useEffect(() => {
    loadPresets();
    loadCategories();
    loadAccounts();
    loadProducts();
  }, []);

  async function loadCategories() {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, kind")
        .in("kind", ["income", "expense", "both"])
        .order("kind", { ascending: true })
        .order("name", { ascending: true});

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

  async function loadAccounts() {
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log("[QuickPresets] Loading accounts for user:", user?.id);
      
      if (!user) {
        console.error("User not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      console.log("[QuickPresets] Loaded accounts:", data?.length, data);
      setAccounts(data || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  }

  async function loadProducts() {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("product_items")
        .select("id, name, default_price_per_unit, category_id, category_type, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(
        (data || []).map((item) => ({
          id: item.id,
          name: item.name,
          default_price_per_unit: item.default_price_per_unit,
          category_id: item.category_id,
          category_type: item.category_type,
        }))
      );
    } catch (error) {
      console.error("Error loading products:", error);
    }
  }

  async function loadPresets() {
    try {
      setLoading(true);
      const data = await getQuickPresets();
      setPresets(data);
    } catch (error) {
      console.error("Error loading presets:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProductId) {
      alert("Выберите товар");
      return;
    }

    // Сумма может быть 0 (для ввода при добавлении транзакции)
    if (formData.amount < 0) {
      alert("Сумма не может быть отрицательной");
      return;
    }
    
    try {
      if (editingId) {
        await updateQuickPreset({ id: editingId, ...formData });
      } else {
        await createQuickPreset(formData);
      }
      
      await loadPresets();
      resetForm();
    } catch (error) {
      console.error("Error saving preset:", error);
      alert("Ошибка при сохранении пресета");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Вы уверены, что хотите удалить этот пресет?")) {
      return;
    }
    
    try {
      await deleteQuickPreset(id);
      await loadPresets();
    } catch (error) {
      console.error("Error deleting preset:", error);
      alert("Ошибка при удалении пресета");
    }
  }

  function handleEdit(preset: QuickTransactionPreset) {
    setEditingId(preset.id);
    setFormData({
      name: preset.name,
      amount: preset.amount,
      direction: preset.direction,
      category_id: preset.category_id,
      account_id: preset.account_id,
      sort_order: preset.sort_order,
    });
    const matchedProduct = products.find((prod) => prod.name === preset.name);
    setSelectedProductId(matchedProduct ? matchedProduct.id : "");
    setShowAddForm(true);
  }

  function resetForm() {
    setFormData({
      name: "",
      amount: 0,
      direction: "expense",
      category_id: null,
      account_id: null,
      sort_order: 0,
    });
    setEditingId(null);
    setShowAddForm(false);
    setSelectedProductId("");
  }

  const formatPrice = (amountMinor: number) => {
    return `${(amountMinor / 100).toFixed(2)} ₽`;
  };

  const expenseProducts = products.filter(
    (product) => product.category_type === "expense" || product.category_type === null
  );
  const incomeProducts = products.filter((product) => product.category_type === "income");
  const neutralProducts = products.filter((product) => product.category_type === "both");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Создавайте пресеты для мгновенного добавления частых транзакций одним кликом
        </div>
        <Button onClick={() => { if (!showAddForm) loadAccounts(); setShowAddForm(!showAddForm); }}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить пресет
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border bg-muted/50">
            <div className="font-medium">{editingId ? "Редактировать пресет" : "Новый пресет"}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Товар <span className="text-destructive">*</span></Label>
                <Select value={selectedProductId} onValueChange={(value) => {
                  setSelectedProductId(value);
                  const product = products.find((p) => p.id === value);
                  if (product) {
                    setFormData((prev) => ({
                      ...prev,
                      name: product.name,
                      category_id: product.category_id,
                      direction: product.category_type === "income" ? "income" : product.category_type === "expense" ? "expense" : prev.direction,
                      amount: product.default_price_per_unit && product.default_price_per_unit > 0 ? product.default_price_per_unit : prev.amount,
                    }));
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="— выберите товар —" /></SelectTrigger>
                  <SelectContent>
                    {expenseProducts.length > 0 && <SelectGroup><SelectLabel>Расходы</SelectLabel>{expenseProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectGroup>}
                    {incomeProducts.length > 0 && <SelectGroup><SelectLabel>Доходы</SelectLabel>{incomeProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectGroup>}
                    {neutralProducts.length > 0 && <SelectGroup><SelectLabel>Универсальные</SelectLabel>{neutralProducts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectGroup>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Тип <span className="text-destructive">*</span></Label>
                <Select value={formData.direction} onValueChange={(v) => setFormData({ ...formData, direction: v as "income" | "expense" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Расход</SelectItem>
                    <SelectItem value="income">Доход</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Сумма (₽) <span className="text-muted-foreground text-xs">(необязательно)</span></Label>
                <Input type="number" step="0.01" value={formData.amount ? formData.amount / 100 : ""} onChange={(e) => setFormData({ ...formData, amount: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0 })} placeholder="Ввод при добавлении" />
              </div>

              <div className="space-y-2">
                <Label>Категория</Label>
                <div className="h-9 px-3 py-2 rounded-md border bg-muted/50 text-sm">{formData.category_id ? categories.find((cat) => cat.id === formData.category_id)?.name || "(удалена)" : "Без категории"}</div>
              </div>

              <div className="space-y-2">
                <Label>Счёт по умолчанию</Label>
                <Select value={formData.account_id || ""} onValueChange={(v) => setFormData({ ...formData, account_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Не выбран" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Не выбран</SelectItem>
                    {accounts.map((acc) => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Порядок</Label>
                <Input type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>Отмена</Button>
              <Button type="submit">{editingId ? "Сохранить" : "Добавить"}</Button>
            </div>
          </form>
        )}

        {presets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Нет добавленных пресетов</p>
            <p className="text-sm">Добавьте пресеты для быстрого создания транзакций</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Счёт</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presets.map((preset) => (
                <TableRow key={preset.id}>
                  <TableCell className="font-medium">{preset.name}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${preset.direction === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {preset.direction === "income" ? "Доход" : "Расход"}
                    </span>
                  </TableCell>
                  <TableCell>{formatPrice(preset.amount)}</TableCell>
                  <TableCell>{preset.category_id ? categories.find(c => c.id === preset.category_id)?.name || "—" : "—"}</TableCell>
                  <TableCell>{preset.account_id ? accounts.find(a => a.id === preset.account_id)?.name || "—" : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(preset)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(preset.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
    </div>
  );
}
