"use client";

import { useState, useEffect, useRef } from "react";
import { searchProductItems, getProductItems } from "@/lib/product-items/service";
import type { ProductItem } from "@/types/product-item";
import styles from "./ProductAutocomplete.module.css";

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

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div className={styles.inputWrapper}>
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${styles.input} ${!isValidProduct && value ? styles.inputInvalid : ""}`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={toggleDropdown}
          className={styles.dropdownButton}
          title="Показать все товары"
        >
          <span className="material-icons">
            {showDropdown ? "expand_less" : "expand_more"}
          </span>
        </button>
      </div>
      
      {loading && (
        <div className={styles.loading}>
          <span className={styles.spinner}></span>
        </div>
      )}

      {!isValidProduct && value && !showSuggestions && !showDropdown && (
        <div className={styles.error}>
          Товар не найден в справочнике. Выберите из списка.
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.map((product, index) => (
            <div
              key={product.id}
              className={`${styles.suggestion} ${
                index === selectedIndex ? styles.selected : ""
              }`}
              onClick={() => handleSelectProduct(product)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className={styles.productName}>{product.name}</div>
              <div className={styles.productDetails}>
                {product.description && (
                  <span className={styles.productDescription}>
                    {product.description}
                  </span>
                )}
                {product.default_price_per_unit && (
                  <span className={styles.productPrice}>
                    {product.description ? " • " : ""}
                    {(product.default_price_per_unit / 100).toFixed(2)} ₽
                  </span>
                )}
                {product.categories && (
                  <span className={styles.productCategory}>
                    {" • "}
                    {product.categories.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && allProducts.length > 0 && (
        <div className={styles.suggestions}>
          {allProducts.map((product) => (
            <div
              key={product.id}
              className={styles.suggestion}
              onClick={() => handleSelectProduct(product)}
            >
              <div className={styles.productName}>{product.name}</div>
              <div className={styles.productDetails}>
                {product.description && (
                  <span className={styles.productDescription}>
                    {product.description}
                  </span>
                )}
                {product.default_price_per_unit && (
                  <span className={styles.productPrice}>
                    {product.description ? " • " : ""}
                    {(product.default_price_per_unit / 100).toFixed(2)} ₽
                  </span>
                )}
                {product.categories && (
                  <span className={styles.productCategory}>
                    {" • "}
                    {product.categories.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && allProducts.length === 0 && (
        <div className={styles.suggestions}>
          <div className={styles.emptyMessage}>
            Нет товаров в справочнике. Добавьте товары в настройках.
          </div>
        </div>
      )}
    </div>
  );
}
