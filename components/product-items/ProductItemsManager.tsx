"use client";

import { useState, useEffect } from "react";
import {
  getProductItems,
  createProductItem,
  updateProductItem,
  permanentDeleteProductItem,
} from "@/lib/product-items/service";
import type { ProductItem, ProductItemInput } from "@/types/product-item";
import { getSupabaseClient } from "@/lib/supabase/client";
import styles from "./ProductItemsManager.module.css";

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

  useEffect(() => {
    loadItems();
    loadCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function loadCategories() {
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
      
      // Найти или создать категорию "Без категории"
      const uncategorized = data?.find(cat => cat.name === "Без категории");
      if (uncategorized) {
        setUncategorizedId(uncategorized.id);
        // Установить по умолчанию для новых товаров
        if (!formData.category_id) {
          setFormData(prev => ({ ...prev, category_id: uncategorized.id }));
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  }

  async function loadItems() {
    try {
      setLoading(true);
      const data = await getProductItems(false); // показываем все, включая неактивные
      setItems(data);
    } catch (error) {
      console.error("Error loading product items:", error);
    } finally {
      setLoading(false);
    }
  }

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
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchContainer}>
          <span className="material-icons" style={{ color: '#757575' }}>search</span>
          <input
            type="text"
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className={styles.clearButton}
              aria-label="Очистить поиск"
            >
              <span className="material-icons">close</span>
            </button>
          )}
        </div>
        <button 
          className={styles.addButton}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <span className="material-icons">add</span>
          Добавить товар
        </button>
      </div>

      {showAddForm && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <h3>{editingId ? "Редактировать товар" : "Новый товар"}</h3>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Название товара *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Молоко"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Единица измерения <span className={styles.required}>*</span></label>
              <select
                value={formData.default_unit}
                onChange={(e) => setFormData({ ...formData, default_unit: e.target.value })}
                required
              >
                <option value="шт">шт</option>
                <option value="кг">кг</option>
                <option value="л">л</option>
                <option value="г">г</option>
                <option value="мл">мл</option>
                <option value="упак">упак</option>
                <option value="м">м</option>
                <option value="м²">м²</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Цена по умолчанию (₽)</label>
              <input
                type="number"
                step="0.01"
                value={formData.default_price_per_unit ? formData.default_price_per_unit / 100 : ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ 
                    ...formData, 
                    default_price_per_unit: value ? Math.round(parseFloat(value) * 100) : null 
                  });
                }}
                placeholder="0.00"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Категория <span className={styles.required}>*</span></label>
              <select
                value={formData.category_id && formData.category_type ? `${formData.category_id}|${formData.category_type}` : formData.category_id || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    setFormData({ ...formData, category_id: null, category_type: null });
                    return;
                  }
                  
                  // Формат: "categoryId|type" для both категорий, или просто "categoryId"
                  const [categoryId, type] = value.split("|");
                  const category = categories.find(c => c.id === categoryId);
                  
                  setFormData({ 
                    ...formData, 
                    category_id: categoryId,
                    category_type: type ? (type as "income" | "expense") : (category?.kind === "both" ? null : null)
                  });
                }}
                required
              >
                <option value="">— выберите категорию —</option>
                {incomeCategories.length > 0 && (
                  <optgroup label="Доходы">
                    {incomeCategories.map((cat) => (
                      <option 
                        key={`${cat.id}-income`} 
                        value={cat.kind === "both" ? `${cat.id}|income` : cat.id}
                      >
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {expenseCategories.length > 0 && (
                  <optgroup label="Расходы">
                    {expenseCategories.map((cat) => (
                      <option 
                        key={`${cat.id}-expense`} 
                        value={cat.kind === "both" ? `${cat.id}|expense` : cat.id}
                      >
                        {cat.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Описание</label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || null })}
              placeholder="Дополнительная информация о товаре"
              rows={2}
            />
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

      <div className={styles.tableContainer}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="material-icons">shopping_cart</span>
            <p>Нет добавленных товаров</p>
            <p className={styles.emptyHint}>Добавьте товары, которые вы часто покупаете</p>
          </div>
        ) : (() => {
          const filteredItems = filterItems(items);
          const hasResults = filteredItems.length > 0;
          
          if (!hasResults && searchQuery) {
            return (
              <div className={styles.emptyState}>
                <span className="material-icons">search_off</span>
                <p>Ничего не найдено</p>
                <p className={styles.emptyHint}>Попробуйте изменить поисковый запрос</p>
              </div>
            );
          }
          
          return (
            <>
              {/* Товары доходов */}
              {(() => {
                const incomeItems = filterItems(items.filter(item => {
                const category = categories.find(c => c.id === item.category_id);
                if (!category) return false;
                if (item.category_type === "income") return true;
                if (category.kind === "income") return true;
                return false;
              }));
              
              if (incomeItems.length === 0) return null;
              
              return (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    <span className={styles.incomeIcon}>💰</span>
                    Доходы
                  </h2>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th>Ед. изм.</th>
                        <th>Цена</th>
                        <th>Категория</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeItems.map((item) => (
                        <tr key={item.id} className={!item.is_active ? styles.inactive : ""}>
                          <td>
                            <div className={styles.itemName}>
                              {item.name}
                              {item.description && (
                                <span className={styles.itemDescription}>{item.description}</span>
                              )}
                            </div>
                          </td>
                          <td>{item.default_unit}</td>
                          <td>{formatPrice(item.default_price_per_unit)}</td>
                          <td>
                            {item.category_id ? (
                              <span>{categories.find(c => c.id === item.category_id)?.name || "—"}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <span className={item.is_active ? styles.statusActive : styles.statusInactive}>
                              {item.is_active ? "Активен" : "Неактивен"}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                onClick={() => handleEdit(item)}
                                className={styles.actionButton}
                                title="Редактировать"
                              >
                                <span className="material-icons">edit</span>
                              </button>
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className={styles.actionButton}
                                title={item.is_active ? "Сделать неактивным" : "Сделать активным"}
                              >
                                <span className="material-icons">
                                  {item.is_active ? "toggle_on" : "toggle_off"}
                                </span>
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
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
                </div>
              );
            })()}

            {/* Товары расходов */}
            {(() => {
              const expenseItems = filterItems(items.filter(item => {
                const category = categories.find(c => c.id === item.category_id);
                if (!category) return false;
                if (item.category_type === "expense") return true;
                if (category.kind === "expense") return true;
                return false;
              }));
              
              if (expenseItems.length === 0) return null;
              
              return (
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>
                    <span className={styles.expenseIcon}>💸</span>
                    Расходы
                  </h2>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th>Ед. изм.</th>
                        <th>Цена</th>
                        <th>Категория</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseItems.map((item) => (
                        <tr key={item.id} className={!item.is_active ? styles.inactive : ""}>
                          <td>
                            <div className={styles.itemName}>
                              {item.name}
                              {item.description && (
                                <span className={styles.itemDescription}>{item.description}</span>
                              )}
                            </div>
                          </td>
                          <td>{item.default_unit}</td>
                          <td>{formatPrice(item.default_price_per_unit)}</td>
                          <td>
                            {item.category_id ? (
                              <span>{categories.find(c => c.id === item.category_id)?.name || "—"}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <span className={item.is_active ? styles.statusActive : styles.statusInactive}>
                              {item.is_active ? "Активен" : "Неактивен"}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                onClick={() => handleEdit(item)}
                                className={styles.actionButton}
                                title="Редактировать"
                              >
                                <span className="material-icons">edit</span>
                              </button>
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className={styles.actionButton}
                                title={item.is_active ? "Сделать неактивным" : "Сделать активным"}
                              >
                                <span className="material-icons">
                                  {item.is_active ? "toggle_on" : "toggle_off"}
                                </span>
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
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
                </div>
              );
            })()}
          </>
          );
        })()}
      </div>
    </div>
  );
}
