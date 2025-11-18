"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./TransactionItems.module.css";
import type { TransactionItemInput } from "@/types/transaction";
import { ProductAutocomplete } from "./ProductAutocomplete";
import type { ProductItem } from "@/types/product-item";
import AmountInputWithCalculator from "@/components/calculator/AmountInputWithCalculator";

type TransactionItemsProps = {
  items: TransactionItemInput[];
  onChange: (items: TransactionItemInput[]) => void;
  currency?: string;
  direction?: "income" | "expense";
};

export function TransactionItems({ items, onChange, currency = "RUB", direction }: TransactionItemsProps) {
  const [isExpanded, setIsExpanded] = useState(items.length > 0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<TransactionItemInput | null>(null);
  const [newItem, setNewItem] = useState<TransactionItemInput>({
    name: "",
    quantity: 1,
    unit: "шт",
    price_per_unit: 0,
    product_id: null,
  });
  const [priceInput, setPriceInput] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [editingProductName, setEditingProductName] = useState<string>("");
  const itemsListRef = useRef<HTMLDivElement>(null);

  // Автоматически раскрываем секцию при наличии позиций
  useEffect(() => {
    if (items.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [items.length, isExpanded]);

  // Автоматическая прокрутка вниз при добавлении нового товара
  useEffect(() => {
    if (itemsListRef.current && items.length > 0) {
      itemsListRef.current.scrollTop = itemsListRef.current.scrollHeight;
    }
  }, [items.length]);

  const formatCurrency = (amountMinor: number) => {
    const major = amountMinor / 100;
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(major);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const itemTotal = Math.round(item.quantity * item.price_per_unit);
      return sum + itemTotal;
    }, 0);
  };

  const handleProductSelect = (product: ProductItem) => {
    setSelectedProduct(product);
    
    // Автоматически подставляем цену из справочника, если она указана
    const pricePerUnit = product.default_price_per_unit && product.default_price_per_unit > 0 
      ? product.default_price_per_unit 
      : 0;
    
    setNewItem({
      name: product.name,
      quantity: 1,
      unit: product.default_unit,
      price_per_unit: pricePerUnit,
      category_id: product.category_id || null,
      category_type: product.category_type || null,
      product_id: product.id,
    });
    
    // Заполняем поле ввода цены, если цена указана
    if (pricePerUnit > 0) {
      setPriceInput((pricePerUnit / 100).toFixed(2));
    } else {
      setPriceInput("");
    }
  };

  const handleAddItem = () => {
    // Проверяем, что товар выбран из справочника
    if (!selectedProduct) {
      alert("Пожалуйста, выберите товар из справочника");
      return;
    }
    
    if (!newItem.name.trim() || newItem.price_per_unit <= 0) {
      return;
    }

    const itemTotal = Math.round(newItem.quantity * newItem.price_per_unit);
    onChange([...items, { ...newItem, total_amount: itemTotal }]);
    
    // Сброс формы
    setNewItem({
      name: "",
      quantity: 1,
      unit: "шт",
      price_per_unit: 0,
      product_id: null,
    });
    setPriceInput("");
    setSelectedProduct(null);
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    const item = items[index];
    setEditingItem({ ...item });
    setEditingProductName(item.name);
    // Устанавливаем текстовое значение цены для редактирования
    const priceValue = item.price_per_unit / 100;
    setPriceInput(priceValue > 0 ? priceValue.toString() : "");
  };

  const handleApplyEdit = (index: number) => {
    if (!editingItem) return;
    
    const itemTotal = Math.round(editingItem.quantity * editingItem.price_per_unit);
    const newItems = [...items];
    newItems[index] = { ...editingItem, total_amount: itemTotal };
    onChange(newItems);
    setEditingIndex(null);
    setEditingItem(null);
    setPriceInput("");
  };

  const totalAmount = calculateTotal();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={isExpanded}
            onChange={(e) => setIsExpanded(e.target.checked)}
            className={styles.checkbox}
          />
          <span className={styles.toggleText}>Добавить позиции товаров</span>
        </label>
      </div>

      {isExpanded && (
        <div className={styles.content}>
          {/* Список существующих позиций */}
          {items.length > 0 && (
            <div className={styles.itemsList} ref={itemsListRef}>
              {items.map((item, index) => (
                <div key={index} className={styles.item}>
                  {editingIndex === index && editingItem ? (
                    // Режим редактирования
                    <div 
                      className={styles.editForm} 
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      onKeyUp={(e) => e.stopPropagation()}
                      onKeyPress={(e) => e.stopPropagation()}
                    >
                      <ProductAutocomplete
                        value={editingProductName}
                        onChange={(value) => {
                          setEditingProductName(value);
                          setEditingItem({ ...editingItem, name: value });
                        }}
                        onSelect={(product) => {
                          setEditingProductName(product.name);
                          setEditingItem({
                            ...editingItem,
                            name: product.name,
                            unit: product.default_unit,
                            category_id: product.category_id || null,
                            category_type: product.category_type || null,
                            product_id: product.id,
                          });
                          // Обновляем цену если она указана в товаре
                          if (product.default_price_per_unit && product.default_price_per_unit > 0) {
                            setEditingItem(prev => prev ? { ...prev, price_per_unit: product.default_price_per_unit || 0 } : null);
                            setPriceInput((product.default_price_per_unit / 100).toFixed(2));
                          }
                        }}
                        placeholder="Начните вводить или выберите товар..."
                        categoryType={direction}
                      />
                      <div className={styles.row}>
                        <input
                          type="number"
                          value={editingItem.quantity}
                          onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => e.stopPropagation()}
                          onKeyUp={(e) => e.stopPropagation()}
                          className={styles.inputSmall}
                          step="0.001"
                          min="0"
                        />
                        <span className={styles.unit}>{editingItem.unit}</span>
                        <span className={styles.multiply}>×</span>
                        <AmountInputWithCalculator
                          value={priceInput}
                          onChange={(value: string) => {
                            setPriceInput(value);
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && numValue >= 0) {
                              setEditingItem({ ...editingItem, price_per_unit: Math.round(numValue * 100) });
                            } else if (value === "") {
                              setEditingItem({ ...editingItem, price_per_unit: 0 });
                            }
                          }}
                          className={styles.inputSmall}
                          placeholder="0"
                          compact={true}
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyEdit(index)}
                          className={styles.btnSave}
                          title="Применить"
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Режим просмотра
                    <>
                      <div className={styles.itemIcon}>🛒</div>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName}>
                          {item.name}
                        </div>
                        <div className={styles.itemDetails}>
                          {item.quantity} {item.unit} × {formatCurrency(item.price_per_unit)} = {formatCurrency(Math.round(item.quantity * item.price_per_unit))}
                        </div>
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(index)}
                          className={styles.btnEdit}
                          title="Редактировать"
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className={styles.btnDelete}
                          title="Удалить"
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Форма добавления новой позиции */}
          <div className={styles.addForm}>
            <ProductAutocomplete
              value={newItem.name}
              onChange={(value) => setNewItem({ ...newItem, name: value })}
              onSelect={handleProductSelect}
              placeholder="Начните вводить название товара..."
              categoryType={direction}
            />
            <div className={styles.row}>
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                placeholder="Кол-во"
                className={styles.inputSmall}
                step="0.001"
                min="0"
              />
              <span className={styles.unit}>{newItem.unit || "—"}</span>
              <span className={styles.multiply}>×</span>
              <AmountInputWithCalculator
                value={priceInput}
                onChange={(value: string) => {
                  setPriceInput(value);
                  const numValue = parseFloat(value.replace(',', '.'));
                  setNewItem({ ...newItem, price_per_unit: isNaN(numValue) ? 0 : Math.round(numValue * 100) });
                }}
                placeholder="Цена"
                className={styles.inputSmall}
                compact={true}
              />
              <button
                type="button"
                onClick={handleAddItem}
                className={styles.btnAdd}
                disabled={!newItem.name.trim() || newItem.price_per_unit <= 0}
              >
                <span className="material-icons">add_circle</span>
                Добавить
              </button>
            </div>
          </div>

          {/* Итого */}
          {items.length > 0 && (
            <div className={styles.total}>
              <span className={styles.totalLabel}>Итого:</span>
              <span className={styles.totalAmount}>{formatCurrency(totalAmount)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
