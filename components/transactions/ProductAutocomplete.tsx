"use client";

import { useState, useEffect, useRef } from "react";
import { searchProductItems, getProductItems } from "@/lib/product-items/service";
import type { ProductItem } from "@/types/product-item";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

type ProductAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (product: ProductItem) => void;
  placeholder?: string;
  categoryType?: "income" | "expense";
};

export function ProductAutocomplete({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Начните вводить или выберите товар...",
  categoryType
}: ProductAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<ProductItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Загрузка всех товаров при монтировании
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await getProductItems(true, categoryType);
        setAllProducts(products);
      } catch (error) {
        console.error("Error loading products:", error);
      }
    };
    loadProducts();
  }, [categoryType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchProducts = async () => {
      if (value.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Не показываем список, если товар уже выбран
      if (selectedProduct && selectedProduct.name === value) {
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      try {
        const results = await searchProductItems(value, categoryType);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error searching products:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounceTimer);
  }, [value, selectedProduct, categoryType]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectProduct(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  const handleSelectProduct = (product: ProductItem) => {
    onChange(product.name);
    onSelect(product);
    setSelectedProduct(product);
    setShowSuggestions(false);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    // Проверяем, есть ли точное совпадение с товаром
    const exactMatch = allProducts.find(p => p.name.toLowerCase() === newValue.toLowerCase());
    setSelectedProduct(exactMatch || null);
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
    setShowSuggestions(false);
  };

  const isValidProduct = selectedProduct !== null;

  const renderProduct = (product: ProductItem, isSelected = false) => (
    <div key={product.id} className={cn("px-3 py-2 cursor-pointer hover:bg-muted rounded-md", isSelected && "bg-muted")} onClick={() => handleSelectProduct(product)} onMouseEnter={() => setSelectedIndex(suggestions.indexOf(product))}>
      <div className="font-medium text-sm">{product.name}</div>
      <div className="text-xs text-muted-foreground">
        {product.description && <span>{product.description}</span>}
        {product.default_price_per_unit && <span>{product.description ? " • " : ""}{(product.default_price_per_unit / 100).toFixed(2)} ₽</span>}
        {product.categories && <span> • {product.categories.name}</span>}
      </div>
    </div>
  );

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-1">
        <Input type="text" value={value} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} className={cn("flex-1", !isValidProduct && value && "border-destructive")} autoComplete="off" />
        <Button type="button" variant="outline" size="icon" onClick={toggleDropdown} title="Показать все товары">
          {showDropdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {loading && <div className="absolute right-12 top-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>}

      {!isValidProduct && value && !showSuggestions && !showDropdown && (
        <div className="text-xs text-destructive mt-1">Товар не найден. Выберите из списка.</div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((product, index) => renderProduct(product, index === selectedIndex))}
        </div>
      )}

      {showDropdown && allProducts.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {allProducts.map((product) => renderProduct(product))}
        </div>
      )}

      {showDropdown && allProducts.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          Нет товаров в справочнике. Добавьте товары в настройках.
        </div>
      )}
    </div>
  );
}
