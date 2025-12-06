"use client";

import { useState, useRef, useEffect } from "react";
import type { TransactionItemInput } from "@/types/transaction";
import { ProductAutocomplete } from "./ProductAutocomplete";
import type { ProductItem } from "@/types/product-item";
import AmountInputWithCalculator from "@/components/calculator/AmountInputWithCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, Pencil, Trash2, PlusCircle, Check } from "lucide-react";

type TransactionItemsProps = {
  items: (TransactionItemInput & { id?: string })[];
  onChange: (items: (TransactionItemInput & { id?: string })[]) => void;
  currency?: string;
  direction?: "income" | "expense";
};

export function TransactionItems({ items, onChange, currency = "RUB", direction }: TransactionItemsProps) {
  const [isExpanded, setIsExpanded] = useState(items.length > 0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<(TransactionItemInput & { id?: string }) | null>(null);
  const [newItem, setNewItem] = useState<TransactionItemInput & { id?: string }>({
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
    <div className="border rounded-lg p-3 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox checked={isExpanded} onCheckedChange={(checked) => setIsExpanded(!!checked)} />
        <span className="text-sm font-medium">Добавить позиции товаров</span>
      </label>

      {isExpanded && (
        <div className="space-y-3">
          {items.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto space-y-2" ref={itemsListRef}>
              {items.map((item, index) => (
                <div key={index} className="p-2 rounded-lg border bg-muted/30">
                  {editingIndex === index && editingItem ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <ProductAutocomplete value={editingProductName} onChange={(value) => { setEditingProductName(value); setEditingItem({ ...editingItem, name: value }); }} onSelect={(product) => { setEditingProductName(product.name); setEditingItem({ ...editingItem, name: product.name, unit: product.default_unit, category_id: product.category_id || null, category_type: product.category_type || null, product_id: product.id }); if (product.default_price_per_unit && product.default_price_per_unit > 0) { setEditingItem(prev => prev ? { ...prev, price_per_unit: product.default_price_per_unit || 0 } : null); setPriceInput((product.default_price_per_unit / 100).toFixed(2)); } }} placeholder="Товар..." categoryType={direction} />
                      <div className="flex items-center gap-2">
                        <Input type="number" value={editingItem.quantity} onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 0 })} className="w-16" step="0.001" min="0" />
                        <span className="text-sm text-muted-foreground">{editingItem.unit}</span>
                        <span className="text-muted-foreground">×</span>
                        <AmountInputWithCalculator value={priceInput} onChange={(value: string) => { setPriceInput(value); const numValue = parseFloat(value); if (!isNaN(numValue) && numValue >= 0) setEditingItem({ ...editingItem, price_per_unit: Math.round(numValue * 100) }); else if (value === "") setEditingItem({ ...editingItem, price_per_unit: 0 }); }} className="w-28" placeholder="0" compact={true} />
                        <Button type="button" size="sm" onClick={() => handleApplyEdit(index)} title="Применить"><Check className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.quantity} {item.unit} × {formatCurrency(item.price_per_unit)} = {formatCurrency(Math.round(item.quantity * item.price_per_unit))}</div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleStartEdit(index)} title="Редактировать"><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveItem(index)} title="Удалить"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 p-2 border rounded-lg bg-muted/20">
            <ProductAutocomplete value={newItem.name} onChange={(value) => setNewItem({ ...newItem, name: value })} onSelect={handleProductSelect} placeholder="Начните вводить название товара..." categoryType={direction} />
            <div className="flex items-center gap-2">
              <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })} placeholder="Кол-во" className="w-16" step="0.001" min="0" />
              <span className="text-sm text-muted-foreground">{newItem.unit || "—"}</span>
              <span className="text-muted-foreground">×</span>
              <AmountInputWithCalculator value={priceInput} onChange={(value: string) => { setPriceInput(value); const numValue = parseFloat(value.replace(',', '.')); setNewItem({ ...newItem, price_per_unit: isNaN(numValue) ? 0 : Math.round(numValue * 100) }); }} placeholder="Цена" className="w-28" compact={true} />
              <Button type="button" size="sm" onClick={handleAddItem} disabled={!newItem.name.trim() || newItem.price_per_unit <= 0}><PlusCircle className="h-4 w-4 mr-1" />Добавить</Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">Итого:</span>
              <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
