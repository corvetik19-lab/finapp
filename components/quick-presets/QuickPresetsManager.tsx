"use client";

import { useState, useEffect } from "react";
import {
  getQuickPresets,
  createQuickPreset,
  updateQuickPreset,
  deleteQuickPreset,
} from "@/lib/quick-presets/service";
import type { QuickTransactionPreset, QuickPresetInput } from "@/types/quick-preset";
import { getSupabaseClient } from "@/lib/supabase/client";
import styles from "./QuickPresetsManager.module.css";

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
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button 
          className={styles.addButton}
          onClick={() => {
            if (!showAddForm) {
              loadAccounts(); // Перезагружаем счета при открытии формы
            }
            setShowAddForm(!showAddForm);
          }}
        >
          <span className="material-icons">add</span>
          Добавить пресет
        </button>
      </div>

      {showAddForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3>{editingId ? "Редактировать пресет" : "Новый пресет"}</h3>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Товар <span className={styles.required}>*</span></label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedProductId(value);

                  const product = products.find((p) => p.id === value);
                  if (product) {
                    setFormData((prev) => ({
                      ...prev,
                      name: product.name,
                      category_id: product.category_id,
                      direction:
                        product.category_type === "income"
                          ? "income"
                          : product.category_type === "expense"
                          ? "expense"
                          : prev.direction,
                      amount:
                        product.default_price_per_unit && product.default_price_per_unit > 0
                          ? product.default_price_per_unit
                          : prev.amount,
                    }));
                  }
                }}
                required
              >
                <option value="">— выберите товар —</option>
                {expenseProducts.length > 0 && (
                  <optgroup label="Расходы">
                    {expenseProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {incomeProducts.length > 0 && (
                  <optgroup label="Доходы">
                    {incomeProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {neutralProducts.length > 0 && (
                  <optgroup label="Универсальные">
                    {neutralProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Тип <span className={styles.required}>*</span></label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value as "income" | "expense" })}
                required
              >
                <option value="expense">Расход</option>
                <option value="income">Доход</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Сумма (₽) <span className={styles.optional}>(необязательно)</span></label>
              <input
                type="number"
                step="0.01"
                value={formData.amount ? formData.amount / 100 : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ 
                    ...formData, 
                    amount: value ? Math.round(parseFloat(value) * 100) : 0 
                  });
                }}
                placeholder="Оставьте пустым для ввода при добавлении"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Категория</label>
              <div className={styles.readonlyField}>
                {formData.category_id
                  ? categories.find((cat) => cat.id === formData.category_id)?.name || "(удалена)"
                  : "Без категории"}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Счёт по умолчанию</label>
              <select
                value={formData.account_id || ""}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value || null })}
              >
                <option value="">Не выбран</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Порядок сортировки</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={resetForm} className={styles.cancelButton}>
              Отмена
            </button>
            <button type="submit" className={styles.saveButton}>
              {editingId ? "Сохранить" : "Добавить"}
            </button>
          </div>
        </form>
      )}

      <div className={styles.presetsList}>
        {presets.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="material-icons">bolt_off</span>
            <p>Нет добавленных пресетов</p>
            <p className={styles.emptyHint}>Добавьте пресеты для быстрого создания транзакций</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Сумма</th>
                <th>Категория</th>
                <th>Счёт</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {presets.map((preset) => (
                <tr key={preset.id}>
                  <td>{preset.name}</td>
                  <td>
                    <span className={preset.direction === "income" ? styles.badgeIncome : styles.badgeExpense}>
                      {preset.direction === "income" ? "Доход" : "Расход"}
                    </span>
                  </td>
                  <td>{formatPrice(preset.amount)}</td>
                  <td>
                    {preset.category_id 
                      ? categories.find(c => c.id === preset.category_id)?.name || "—" 
                      : "—"}
                  </td>
                  <td>
                    {preset.account_id 
                      ? accounts.find(a => a.id === preset.account_id)?.name || "—" 
                      : "—"}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleEdit(preset)}
                        className={styles.actionButton}
                        title="Редактировать"
                      >
                        <span className="material-icons">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(preset.id)}
                        className={styles.actionButton}
                        title="Удалить"
                      >
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
