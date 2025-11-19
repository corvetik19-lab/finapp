"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ReceiptChatModal.module.css";
import { recognizeReceiptFile, recognizeReceiptFromPath } from "@/lib/ai/receipt-ocr";
import { getRecentReceipts, Receipt } from "@/lib/receipts/actions";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ReceiptItem {
  receiptName: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  matchedProductId: string | null;
  matchedProductName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  unit?: string;
  isManuallyAdded?: boolean;
}

interface AvailableProduct {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  defaultUnit?: string;
}

interface ReceiptPreview {
  storeName: string;
  date: string;
  items: ReceiptItem[];
  totalAmount: number;
  availableProducts: AvailableProduct[];
}

interface ReceiptChatModalProps {
  onClose: () => void;
}

export default function ReceiptChatModal({ onClose }: ReceiptChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Привет! Вставьте текст чека и я автоматически создам транзакцию с позициями товаров.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<ReceiptPreview | null>(null);
  const [receiptText, setReceiptText] = useState("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("шт");
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null); // Индекс позиции для которой добавляется товар
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({}); // Поисковые запросы для каждой позиции
  const [categories, setCategories] = useState<Array<{id: string; name: string}>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Сбрасываем value, чтобы можно было выбрать тот же файл повторно
    e.target.value = "";

    // Проверка размера (макс 10МБ)
    if (file.size > 10 * 1024 * 1024) {
      alert("Файл слишком большой. Максимальный размер 10 МБ");
      return;
    }

    setIsUploading(true);
    const loadingMsg: Message = {
      role: "assistant",
      content: "👀 Смотрю на ваш чек, подождите секунду...",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await recognizeReceiptFile(formData);

      // Удаляем сообщение о загрузке
      setMessages((prev) => prev.filter(m => m !== loadingMsg));

      if (result.success) {
        setInput(result.text);
        
        const successMsg: Message = {
          role: "assistant",
          content: "✅ Текст чека распознан! Проверьте его ниже и отправьте для анализа.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMsg]);
        
        // Фокус на поле ввода
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else {
        const errorMsg: Message = {
          role: "assistant",
          content: `❌ Ошибка: ${result.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessages((prev) => prev.filter(m => m !== loadingMsg));
      const errorMsg: Message = {
        role: "assistant",
        content: "❌ Произошла ошибка при загрузке файла",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsUploading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Восстанавливаем данные из localStorage при монтировании
  useEffect(() => {
    const savedInput = localStorage.getItem('receiptChatInput');
    const savedPreview = localStorage.getItem('receiptChatPreview');
    const savedText = localStorage.getItem('receiptChatText');

    if (savedInput) setInput(savedInput);
    if (savedText) setReceiptText(savedText);
    if (savedPreview) {
      try {
        setPreview(JSON.parse(savedPreview));
      } catch {
        // Игнорируем ошибки парсинга
      }
    }
  }, []);

  // Сохраняем input в localStorage
  useEffect(() => {
    localStorage.setItem('receiptChatInput', input);
  }, [input]);

  // Сохраняем preview в localStorage
  useEffect(() => {
    if (preview) {
      localStorage.setItem('receiptChatPreview', JSON.stringify(preview));
    } else {
      localStorage.removeItem('receiptChatPreview');
    }
  }, [preview]);

  // Сохраняем receiptText в localStorage
  useEffect(() => {
    localStorage.setItem('receiptChatText', receiptText);
  }, [receiptText]);

  // Закрываем выпадающие списки при клике вне их
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.searchableSelect}`)) {
        setSearchTerms({});
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
    // Загружаем категории для выбора при создании товара
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/categories?kind=expense");
      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleOpenGallery = async () => {
    setShowGallery(true);
    const data = await getRecentReceipts();
    setReceipts(data);
  };

  const handleSelectFromGallery = async (receipt: Receipt) => {
    setShowGallery(false);
    setIsUploading(true);
    
    const loadingMsg: Message = {
      role: "assistant",
      content: "👀 Смотрю на ваш чек из галереи...",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      const result = await recognizeReceiptFromPath(receipt.file_path, receipt.mime_type);

      setMessages((prev) => prev.filter(m => m !== loadingMsg));

      if (result.success) {
        setInput(result.text);
        
        const successMsg: Message = {
          role: "assistant",
          content: `✅ Чек "${receipt.file_name}" распознан! Проверьте текст и отправьте.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMsg]);
        setTimeout(() => textareaRef.current?.focus(), 100);
      } else {
        const errorMsg: Message = {
          role: "assistant",
          content: `❌ Ошибка: ${result.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error("Gallery processing error:", error);
      setMessages((prev) => prev.filter(m => m !== loadingMsg));
      const errorMsg: Message = {
        role: "assistant",
        content: "❌ Ошибка при обработке файла",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsUploading(false);
    }
  };

  // Автоматическое определение единицы измерения из названия товара
  const detectUnit = (name: string): string => {
    const lowerName = name.toLowerCase();
    
    // Проверяем на вес (кг, г)
    if (lowerName.includes('кг') || lowerName.includes('килограмм')) return 'кг';
    if (lowerName.includes(' г ') || lowerName.includes(' г,') || lowerName.match(/\d+г/)) return 'г';
    if (lowerName.includes('мг')) return 'мг';
    
    // Проверяем на объем (л, мл)
    if (lowerName.includes(' л ') || lowerName.includes('литр') || lowerName.match(/\d+л/)) return 'л';
    if (lowerName.includes('мл') || lowerName.includes('миллилитр')) return 'мл';
    
    // Проверяем на упаковки
    if (lowerName.includes('упак') || lowerName.includes('пач')) return 'упак';
    if (lowerName.includes('рул') || lowerName.includes('рулон')) return 'рул';
    if (lowerName.includes('бут') || lowerName.includes('бутыл')) return 'бут';
    if (lowerName.includes('банк')) return 'банк';
    if (lowerName.includes('пакет')) return 'пакет';
    
    // По умолчанию - штуки
    return 'шт';
  };

  // Автоматическое определение категории по названию товара
  const detectCategory = (): string => {
    // Ищем категорию "Питание" по умолчанию для продуктов
    const питаниеCategory = categories.find(c => c.name.toLowerCase() === 'питание');
    if (питаниеCategory) {
      return питаниеCategory.id;
    }
    
    // Если категория "Питание" не найдена, возвращаем первую доступную
    return categories[0]?.id || '';
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim() || !newProductCategory) return;

    // Проверяем на дубликаты (без учёта регистра)
    const trimmedName = newProductName.trim().toLowerCase();
    const isDuplicate = preview?.availableProducts.some(
      product => product.name.toLowerCase() === trimmedName
    );

    if (isDuplicate) {
      alert(`Товар с названием "${newProductName.trim()}" уже существует!`);
      return;
    }

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProductName.trim(),
          category_id: newProductCategory,
          default_unit: newProductUnit,
          is_active: true
        })
      });

      const data = await response.json();
      
      if (data.success && preview) {
        // Добавляем новый товар в список доступных
        const newProduct = {
          id: data.product.id,
          name: data.product.name,
          categoryId: newProductCategory,
          categoryName: categories.find(c => c.id === newProductCategory)?.name || null,
          defaultUnit: data.product.default_unit || "шт"
        };
        
        // Автоматически выбираем новый товар для текущей позиции
        const updatedItems = [...preview.items];
        if (currentItemIndex !== null && updatedItems[currentItemIndex]) {
          updatedItems[currentItemIndex] = {
            ...updatedItems[currentItemIndex],
            matchedProductId: newProduct.id,
            matchedProductName: newProduct.name,
            categoryId: newProduct.categoryId,
            categoryName: newProduct.categoryName,
            unit: newProduct.defaultUnit
          };
        }
        
        setPreview({
          ...preview,
          items: updatedItems,
          availableProducts: [...preview.availableProducts, newProduct]
        });

        // Закрываем модалку и очищаем форму
        setShowAddProductModal(false);
        setNewProductName("");
        setNewProductCategory("");
        setNewProductUnit("шт");
        setCurrentItemIndex(null);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Ошибка при добавлении товара");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setReceiptText(input);
    setInput("");
    setIsProcessing(true);

    try {
      // Отправляем запрос на получение предпросмотра
      const response = await fetch("/api/ai/process-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiptText: input,
          preview: true,
        }),
      });

      const data = await response.json();

      if (data.success && data.preview && data.data) {
        // Показываем предпросмотр
        setPreview(data.data);
        const assistantMessage: Message = {
          role: "assistant",
          content: "✅ Чек распознан! Проверьте данные и нажмите 'Сохранить' или отредактируйте при необходимости.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.message || "Ошибка обработки чека",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "❌ Ошибка обработки чека. Попробуйте еще раз.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSaveReceipt = async () => {
    if (!preview) return;

    setIsProcessing(true);

    try {
      // Группируем товары по категориям
      const itemsByCategory = new Map<string, typeof preview.items>();
      
      for (const item of preview.items) {
        if (!item.matchedProductId) continue; // Пропускаем не сопоставленные товары
        
        const categoryKey = item.categoryId || "no_category";
        if (!itemsByCategory.has(categoryKey)) {
          itemsByCategory.set(categoryKey, []);
        }
        itemsByCategory.get(categoryKey)!.push(item);
      }

      // Отправляем запрос на сохранение с группировкой по категориям
      const response = await fetch("/api/ai/save-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeName: preview.storeName,
          date: preview.date,
          itemsByCategory: Array.from(itemsByCategory.entries()).map(([categoryId, items]) => ({
            categoryId: categoryId === "no_category" ? null : categoryId,
            categoryName: items[0]?.categoryName || null,
            items: items.map(item => ({
              productId: item.matchedProductId,
              productName: item.matchedProductName,
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
              total: item.total
            })),
            totalAmount: items.reduce((sum, item) => sum + item.total, 0)
          })),
          totalAmount: preview.totalAmount
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "Чек обработан!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.success) {
        // Очищаем localStorage при успешном сохранении
        localStorage.removeItem('receiptChatInput');
        localStorage.removeItem('receiptChatPreview');
        localStorage.removeItem('receiptChatText');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "❌ Ошибка сохранения чека. Попробуйте еще раз.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setReceiptText("");
    // Очищаем localStorage при отмене
    localStorage.removeItem('receiptChatPreview');
    localStorage.removeItem('receiptChatText');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContainer}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📄 Добавить чек</h2>
          <button
            className={styles.closeButton}
            onClick={() => {
              // Очищаем localStorage при закрытии
              localStorage.removeItem('receiptChatInput');
              localStorage.removeItem('receiptChatPreview');
              localStorage.removeItem('receiptChatText');
              onClose();
            }}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.message} ${
                msg.role === "user" ? styles.userMessage : styles.assistantMessage
              }`}
            >
              <div className={styles.messageContent}>
                {msg.content.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <div className={styles.messageTime}>
                {msg.timestamp.toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>


        <form className={styles.inputForm} onSubmit={handleSubmit}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf"
            style={{ display: "none" }}
          />
          <div className={styles.attachButtons}>
            <button
              type="button"
              className={styles.attachButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isUploading}
              title="Загрузить файл"
            >
              📎
            </button>
            <button
              type="button"
              className={styles.attachButton}
              onClick={handleOpenGallery}
              disabled={isProcessing || isUploading}
              title="Выбрать из галереи"
            >
              🖼️
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Вставьте текст чека..."
            disabled={isProcessing}
            rows={3}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!input.trim() || isProcessing}
          >
            {isProcessing ? "⏳" : "→"}
          </button>
        </form>

        <div className={styles.hint}>
          💡 Совет: Скопируйте весь текст чека и вставьте сюда. Нейросеть
          автоматически найдёт товары, цены и создаст транзакцию.
        </div>
      </div>
      
      {/* Модалка галереи */}
      {showGallery && (
        <div className={styles.galleryOverlay} onClick={() => setShowGallery(false)}>
          <div className={styles.galleryModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.galleryHeader}>
              <h3>Выбрать из загруженных</h3>
              <button onClick={() => setShowGallery(false)} className={styles.closeButton}>×</button>
            </div>
            <div className={styles.galleryGrid}>
              {receipts.length === 0 ? (
                <p className={styles.emptyGallery}>Нет загруженных чеков</p>
              ) : (
                receipts.map((receipt) => (
                  <div 
                    key={receipt.id} 
                    className={styles.galleryItem}
                    onClick={() => handleSelectFromGallery(receipt)}
                  >
                    <div className={styles.galleryIcon}>
                      {receipt.mime_type.startsWith('image/') ? '🖼️' : '📄'}
                    </div>
                    <div className={styles.galleryName}>{receipt.file_name}</div>
                    <div className={styles.galleryDate}>
                      {new Date(receipt.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {preview && (
        <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.previewHeader}>
            <h3>📋 Предпросмотр чека</h3>
            <button
              className={styles.closeButton}
              onClick={handleCancelPreview}
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
          <div className={styles.previewBody}>
            <div className={styles.previewField}>
              <label>Магазин:</label>
              <input
                type="text"
                value={preview.storeName}
                onChange={(e) => setPreview({ ...preview, storeName: e.target.value })}
                className={styles.previewInput}
              />
            </div>
            <div className={styles.previewField}>
              <label>Дата:</label>
              <input
                type="date"
                value={preview.date}
                onChange={(e) => setPreview({ ...preview, date: e.target.value })}
                className={styles.previewInput}
              />
            </div>
            <div className={styles.previewItems}>
              <h4>Товары:</h4>
              {preview.items.map((item, idx) => (
                <div key={idx} className={styles.previewItemRow}>
                  <div className={styles.previewItemMapping}>
                    {item.isManuallyAdded ? (
                      <input
                        type="text"
                        value={item.receiptName}
                        onChange={(e) => {
                          const newItems = [...preview.items];
                          newItems[idx] = { ...item, receiptName: e.target.value };
                          setPreview({ ...preview, items: newItems });
                        }}
                        placeholder="Название товара"
                        className={styles.receiptNameInput}
                      />
                    ) : (
                      <span className={styles.receiptName}>{item.receiptName}</span>
                    )}
                    <span className={styles.arrow}>→</span>
                    <div className={styles.productSelectWrapper}>
                      <div className={styles.searchableSelect}>
                        <input
                          type="text"
                          placeholder="Поиск товара..."
                          value={searchTerms[idx] || item.matchedProductName || ""}
                          onChange={(e) => {
                            setSearchTerms({ ...searchTerms, [idx]: e.target.value });
                          }}
                          onFocus={() => {
                            // При фокусе показываем все товары
                            if (!searchTerms[idx]) {
                              setSearchTerms({ ...searchTerms, [idx]: "" });
                            }
                          }}
                          className={styles.productSearchInput}
                        />
                        {searchTerms[idx] !== undefined && (
                          <div className={styles.productDropdown}>
                            {preview.availableProducts
                              .filter(product => 
                                product.name.toLowerCase().includes((searchTerms[idx] || "").toLowerCase())
                              )
                              .slice(0, 10)
                              .map(product => (
                                <div
                                  key={product.id}
                                  className={styles.productOption}
                                  onClick={() => {
                                    const newItems = [...preview.items];
                                    newItems[idx] = {
                                      ...item,
                                      matchedProductId: product.id,
                                      matchedProductName: product.name,
                                      categoryId: product.categoryId,
                                      categoryName: product.categoryName,
                                      unit: product.defaultUnit || "шт"
                                    };
                                    setPreview({ ...preview, items: newItems });
                                    const newSearchTerms = { ...searchTerms };
                                    delete newSearchTerms[idx];
                                    setSearchTerms(newSearchTerms);
                                  }}
                                >
                                  {product.name} {product.categoryName ? `(${product.categoryName})` : ''}
                                </div>
                              ))}
                            {preview.availableProducts.filter(product => 
                              product.name.toLowerCase().includes((searchTerms[idx] || "").toLowerCase())
                            ).length === 0 && (
                              <div className={styles.productOption} style={{ color: '#999' }}>
                                Товары не найдены
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.addProductButton}
                        onClick={() => {
                          const detectedUnit = detectUnit(item.receiptName);
                          const detectedCategoryId = detectCategory();
                          setNewProductName(item.receiptName);
                          setNewProductUnit(detectedUnit);
                          setNewProductCategory(detectedCategoryId);
                          setCurrentItemIndex(idx); // Сохраняем индекс текущей позиции
                          setShowAddProductModal(true);
                        }}
                        title="Добавить новый товар"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className={styles.previewItemPrice}>
                    {item.isManuallyAdded ? (
                      <>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseFloat(e.target.value) || 0;
                            const newTotal = newQuantity * item.pricePerUnit;
                            const newItems = [...preview.items];
                            newItems[idx] = { ...item, quantity: newQuantity, total: newTotal };
                            setPreview({ ...preview, items: newItems });
                          }}
                          className={styles.quantityInput}
                        />
                        <select
                          value={item.unit || "шт"}
                          onChange={(e) => {
                            const newItems = [...preview.items];
                            newItems[idx] = { ...item, unit: e.target.value };
                            setPreview({ ...preview, items: newItems });
                          }}
                          className={styles.unitSelect}
                        >
                          <option value="шт">шт</option>
                          <option value="кг">кг</option>
                          <option value="л">л</option>
                          <option value="г">г</option>
                          <option value="мл">мл</option>
                          <option value="упак">упак</option>
                        </select>
                        <span>×</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.pricePerUnit}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            const newTotal = item.quantity * newPrice;
                            const newItems = [...preview.items];
                            newItems[idx] = { ...item, pricePerUnit: newPrice, total: newTotal };
                            setPreview({ ...preview, items: newItems });
                          }}
                          className={styles.priceInput}
                        />
                        <span>₽ =</span>
                        <strong>{item.total.toFixed(2)} ₽</strong>
                        <button
                          type="button"
                          className={styles.deleteItemButton}
                          onClick={() => {
                            const newItems = preview.items.filter((_, i) => i !== idx);
                            setPreview({ ...preview, items: newItems });
                          }}
                          title="Удалить товар"
                        >
                          <span className="material-icons">delete</span>
                        </button>
                      </>
                    ) : (
                      <span>
                        {item.quantity} {item.unit || "шт"} × {item.pricePerUnit.toFixed(2)} ₽ = {item.total.toFixed(2)} ₽
                      </span>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Кнопка добавления нового товара */}
              <button
                type="button"
                className={styles.addNewItemButton}
                onClick={() => {
                  const newItem: ReceiptItem = {
                    receiptName: "",
                    quantity: 1,
                    pricePerUnit: 0,
                    total: 0,
                    matchedProductId: null,
                    matchedProductName: null,
                    categoryId: null,
                    categoryName: null,
                    unit: "шт",
                    isManuallyAdded: true
                  };
                  setPreview({
                    ...preview,
                    items: [...preview.items, newItem]
                  });
                }}
              >
                <span className="material-icons">add</span>
                Добавить товар
              </button>
            </div>
            
            {/* Группировка по категориям */}
            <div className={styles.previewGrouping}>
              <h4>📊 Транзакции по категориям:</h4>
              {(() => {
                const grouped = new Map<string, typeof preview.items>();
                let addedTotal = 0;
                
                preview.items.forEach(item => {
                  if (!item.matchedProductId) return;
                  addedTotal += item.total;
                  const key = item.categoryId || "no_category";
                  if (!grouped.has(key)) grouped.set(key, []);
                  grouped.get(key)!.push(item);
                });
                
                const groupedElements = Array.from(grouped.entries()).map(([categoryId, items]) => {
                  const categoryName = items[0]?.categoryName || "Без категории";
                  const categoryTotal = items.reduce((sum, item) => sum + item.total, 0);
                  
                  return (
                    <div key={categoryId} className={styles.categoryGroup}>
                      <div className={styles.categoryHeader}>
                        <span className={styles.categoryName}>{categoryName}</span>
                        <span className={styles.categoryTotal}>{categoryTotal.toFixed(2)} ₽</span>
                      </div>
                      <div className={styles.categoryItems}>
                        {items.map((item, idx) => (
                          <div key={idx} className={styles.categoryItem}>
                            • {item.matchedProductName} ({item.quantity} {item.unit || "шт"})
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
                
                // Добавляем информацию о суммах в конце
                const difference = preview.totalAmount - addedTotal;
                const isComplete = Math.abs(difference) < 0.01;
                
                return (
                  <>
                    {groupedElements}
                    <div className={styles.summaryInfo}>
                      <div className={styles.summaryRow}>
                        <span>Итого по чеку:</span>
                        <strong>{preview.totalAmount.toFixed(2)} ₽</strong>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>Добавлено товаров:</span>
                        <strong style={{ color: isComplete ? '#10b981' : '#f59e0b' }}>
                          {addedTotal.toFixed(2)} ₽
                        </strong>
                      </div>
                      {!isComplete && (
                        <div className={styles.summaryRow} style={{ color: '#ef4444' }}>
                          <span>Разница:</span>
                          <strong>{Math.abs(difference).toFixed(2)} ₽</strong>
                        </div>
                      )}
                      {isComplete && (
                        <div className={styles.summaryRow} style={{ color: '#10b981' }}>
                          <span>✅ Все товары добавлены!</span>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div className={styles.previewActions}>
              <button
                type="button"
                onClick={handleCancelPreview}
                className={styles.cancelButton}
                disabled={isProcessing}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveReceipt}
                className={styles.saveButton}
                disabled={isProcessing}
              >
                {isProcessing ? "⏳ Сохранение..." : "✅ Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модалка для добавления нового товара */}
      {showAddProductModal && (
        <div className={styles.addProductModal} onClick={() => {
          setShowAddProductModal(false);
          setCurrentItemIndex(null);
        }}>
          <div className={styles.addProductContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.addProductHeader}>
              <h3>➕ Добавить новый товар</h3>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setShowAddProductModal(false);
                  setCurrentItemIndex(null);
                }}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className={styles.addProductBody}>
              <div className={styles.addProductField}>
                <label>Название товара:</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className={styles.addProductInput}
                  placeholder="Введите название..."
                  autoFocus
                />
              </div>
              <div className={styles.addProductField}>
                <label>Категория:</label>
                <select
                  value={newProductCategory}
                  onChange={(e) => setNewProductCategory(e.target.value)}
                  className={styles.addProductSelect}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.addProductField}>
                <label>Единица измерения:</label>
                <select
                  value={newProductUnit}
                  onChange={(e) => setNewProductUnit(e.target.value)}
                  className={styles.addProductSelect}
                >
                  <option value="шт">шт (штуки)</option>
                  <option value="кг">кг (килограммы)</option>
                  <option value="г">г (граммы)</option>
                  <option value="мг">мг (миллиграммы)</option>
                  <option value="л">л (литры)</option>
                  <option value="мл">мл (миллилитры)</option>
                  <option value="упак">упак (упаковки)</option>
                  <option value="рул">рул (рулоны)</option>
                  <option value="бут">бут (бутылки)</option>
                  <option value="банк">банк (банки)</option>
                  <option value="пакет">пакет (пакеты)</option>
                </select>
              </div>
              <div className={styles.addProductActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddProductModal(false);
                    setCurrentItemIndex(null);
                  }}
                  className={styles.cancelButton}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className={styles.saveButton}
                  disabled={!newProductName.trim() || !newProductCategory}
                >
                  ✅ Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
