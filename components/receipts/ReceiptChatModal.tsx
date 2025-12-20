"use client";

import { useState, useRef, useEffect } from "react";
import { recognizeReceiptFile, recognizeReceiptFromPath } from "@/lib/ai/receipt-ocr";
import { getRecentReceipts, Receipt } from "@/lib/receipts/actions";
import { Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast/ToastContext";

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

interface InitialReceipt {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string;
}

interface ReceiptChatModalProps {
  onClose: () => void;
  initialReceipt?: InitialReceipt;
}

export default function ReceiptChatModal({ onClose, initialReceipt }: ReceiptChatModalProps) {
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
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [categories, setCategories] = useState<Array<{id: string; name: string}>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show: showToast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

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
      setMessages((prev) => prev.filter(m => m !== loadingMsg));

      if (result.success) {
        setInput(result.text);
        const successMsg: Message = {
          role: "assistant",
          content: "✅ Текст чека распознан! Проверьте его ниже и отправьте для анализа.",
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

  useEffect(() => {
    const savedInput = localStorage.getItem('receiptChatInput');
    const savedPreview = localStorage.getItem('receiptChatPreview');
    const savedText = localStorage.getItem('receiptChatText');
    if (savedInput) setInput(savedInput);
    if (savedText) setReceiptText(savedText);
    if (savedPreview) {
      try {
        setPreview(JSON.parse(savedPreview));
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('receiptChatInput', input);
  }, [input]);

  useEffect(() => {
    if (preview) {
      localStorage.setItem('receiptChatPreview', JSON.stringify(preview));
    } else {
      localStorage.removeItem('receiptChatPreview');
    }
  }, [preview]);

  useEffect(() => {
    localStorage.setItem('receiptChatText', receiptText);
  }, [receiptText]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-searchable-select]')) {
        setSearchTerms({});
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
    loadCategories();
  }, []);

  // Обработка initialReceipt - автоматическое распознавание при открытии
  useEffect(() => {
    if (initialReceipt) {
      const processInitialReceipt = async () => {
        setIsUploading(true);
        setSelectedReceipt({
          id: initialReceipt.id,
          file_name: initialReceipt.file_name,
          file_path: initialReceipt.file_path,
          mime_type: initialReceipt.mime_type,
          created_at: new Date().toISOString(),
        });
        
        const loadingMsg: Message = {
          role: "assistant",
          content: `👀 Распознаю чек "${initialReceipt.file_name}"...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, loadingMsg]);

        try {
          const result = await recognizeReceiptFromPath(initialReceipt.file_path, initialReceipt.mime_type);
          setMessages((prev) => prev.filter(m => m !== loadingMsg));

          if (result.success) {
            setInput(result.text);
            const successMsg: Message = {
              role: "assistant",
              content: `✅ Чек распознан! Проверьте текст и отправьте для создания транзакции.`,
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
          console.error("Initial receipt processing error:", error);
          setMessages((prev) => prev.filter(m => m !== loadingMsg));
          const errorMsg: Message = {
            role: "assistant",
            content: "❌ Ошибка при обработке чека",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        } finally {
          setIsUploading(false);
        }
      };
      
      processInitialReceipt();
    }
  }, [initialReceipt]);

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/categories?kind=expense");
      const data = await response.json();
      if (data.categories) setCategories(data.categories);
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
    setSelectedReceipt(receipt);
    
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

  const detectUnit = (name: string): string => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('кг') || lowerName.includes('килограмм')) return 'кг';
    if (lowerName.includes(' г ') || lowerName.includes(' г,') || lowerName.match(/\d+г/)) return 'г';
    if (lowerName.includes('мг')) return 'мг';
    if (lowerName.includes(' л ') || lowerName.includes('литр') || lowerName.match(/\d+л/)) return 'л';
    if (lowerName.includes('мл') || lowerName.includes('миллилитр')) return 'мл';
    if (lowerName.includes('упак') || lowerName.includes('пач')) return 'упак';
    if (lowerName.includes('рул') || lowerName.includes('рулон')) return 'рул';
    if (lowerName.includes('бут') || lowerName.includes('бутыл')) return 'бут';
    if (lowerName.includes('банк')) return 'банк';
    if (lowerName.includes('пакет')) return 'пакет';
    return 'шт';
  };

  const detectCategory = (): string => {
    const питаниеCategory = categories.find(c => c.name.toLowerCase() === 'питание');
    if (питаниеCategory) return питаниеCategory.id;
    return categories[0]?.id || '';
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim() || !newProductCategory) return;

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
        const newProduct = {
          id: data.product.id,
          name: data.product.name,
          categoryId: newProductCategory,
          categoryName: categories.find(c => c.id === newProductCategory)?.name || null,
          defaultUnit: data.product.default_unit || "шт"
        };
        
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
      const response = await fetch("/api/ai/process-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptText: input, preview: true }),
      });

      const data = await response.json();

      if (data.success && data.preview && data.data) {
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
      const validItems = preview.items.filter(
        (item) => item.receiptName?.trim() && item.quantity > 0
      );

      if (validItems.length === 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "❌ Нет позиций для сохранения. Добавьте товары или сопоставьте их.",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const itemsByCategory = new Map<string, typeof preview.items>();
      for (const item of validItems) {
        const categoryKey = item.categoryId || "no_category";
        if (!itemsByCategory.has(categoryKey)) itemsByCategory.set(categoryKey, []);
        itemsByCategory.get(categoryKey)!.push(item);
      }

      const requestBody = {
        storeName: preview.storeName,
        date: preview.date,
        itemsByCategory: Array.from(itemsByCategory.entries()).map(([categoryId, items]) => ({
          categoryId: categoryId === "no_category" ? null : categoryId,
          categoryName: items[0]?.categoryName || null,
          items: items.map(item => ({
            productId: item.matchedProductId,
            productName: item.matchedProductName || item.receiptName,
            receiptName: item.receiptName,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            total: item.total,
            unit: item.unit || "шт",
          })),
          totalAmount: items.reduce((sum, item) => sum + item.total, 0)
        })),
        totalAmount: preview.totalAmount
      };
      
      const response = await fetch("/api/ai/save-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "Чек обработан!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (data.success) {
        showToast("✅ Транзакции по чеку созданы", { type: "success" });
        
        // Удаляем чек после успешного создания транзакции
        if (selectedReceipt) {
          try {
            const deleteResponse = await fetch("/api/attachments/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileId: selectedReceipt.id,
                storagePath: selectedReceipt.file_path
              })
            });
            
            const deleteResult = await deleteResponse.json();
            if (deleteResult.success) {
              console.log("Чек успешно удалён:", selectedReceipt.id);
            } else {
              console.error("Ошибка удаления чека:", deleteResult.error);
            }
          } catch (deleteError) {
            console.error("Ошибка удаления чека:", deleteError);
          }
        }
        
        localStorage.removeItem('receiptChatInput');
        localStorage.removeItem('receiptChatPreview');
        localStorage.removeItem('receiptChatText');
        setPreview(null);
        setSelectedReceipt(null);
        
        // Закрываем модалку и обновляем страницу
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } else if (data.message) {
        showToast(data.message, { type: "error" });
      } else {
        showToast("❌ Транзакции не созданы", { type: "error" });
      }
    } catch {
      showToast("❌ Ошибка сохранения чека", { type: "error" });
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
    localStorage.removeItem('receiptChatPreview');
    localStorage.removeItem('receiptChatText');
  };

  const handleCloseModal = () => {
    localStorage.removeItem('receiptChatInput');
    localStorage.removeItem('receiptChatPreview');
    localStorage.removeItem('receiptChatText');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="flex gap-4 max-w-6xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Чат */}
        <div className="bg-card rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">📄 Добавить чек</h2>
            <Button variant="ghost" size="icon" onClick={handleCloseModal} aria-label="Закрыть">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg p-3 max-w-[85%]",
                  msg.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                <div className="text-sm">
                  {msg.content.split("\n").map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form className="p-4 border-t flex gap-2" onSubmit={handleSubmit}>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf" style={{ display: "none" }} />
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isProcessing || isUploading} title="Загрузить файл">📎</Button>
              <Button type="button" variant="ghost" size="icon" onClick={handleOpenGallery} disabled={isProcessing || isUploading} title="Выбрать из галереи">🖼️</Button>
            </div>
            <textarea
              ref={textareaRef}
              className="flex-1 min-h-[60px] p-2 border rounded-md resize-none text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Вставьте текст чека..."
              disabled={isProcessing}
              rows={3}
            />
            <Button type="submit" disabled={!input.trim() || isProcessing}>
              {isProcessing ? "⏳" : "→"}
            </Button>
          </form>

          <div className="p-3 text-xs text-muted-foreground bg-muted/50 rounded-b-lg">
            💡 Совет: Скопируйте весь текст чека и вставьте сюда. Нейросеть автоматически найдёт товары.
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden border">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl">🧾</span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Предпросмотр чека</h3>
                  <p className="text-xs text-muted-foreground">{preview.items.length} позиций</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCancelPreview} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Store & Date */}
              <div className="px-6 py-4 bg-muted/30 border-b">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Магазин</label>
                    <Input 
                      type="text" 
                      value={preview.storeName} 
                      onChange={(e) => setPreview({ ...preview, storeName: e.target.value })} 
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Дата</label>
                    <Input 
                      type="date" 
                      value={preview.date} 
                      onChange={(e) => setPreview({ ...preview, date: e.target.value })} 
                      className="h-10 bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs">📦</span>
                    Товары
                  </h4>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      const newItem: ReceiptItem = { receiptName: "", quantity: 1, pricePerUnit: 0, total: 0, matchedProductId: null, matchedProductName: null, categoryId: null, categoryName: null, unit: "шт", isManuallyAdded: true };
                      setPreview({ ...preview, items: [...preview.items, newItem] });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Добавить
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {preview.items.map((item, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-xl border border-border/50 hover:border-border transition-colors">
                      {/* Row 1: Receipt name → Product match */}
                      <div className="flex items-center gap-2">
                        {item.isManuallyAdded ? (
                          <Input
                            type="text"
                            value={item.receiptName}
                            onChange={(e) => {
                              const newItems = [...preview.items];
                              newItems[idx] = { ...item, receiptName: e.target.value };
                              setPreview({ ...preview, items: newItems });
                            }}
                            placeholder="Название товара"
                            className="flex-1 h-9 text-sm bg-background"
                          />
                        ) : (
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{item.receiptName}</span>
                          </div>
                        )}
                        
                        <span className="text-muted-foreground shrink-0">→</span>
                        
                        {/* Product selector with + button inline */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0" data-searchable-select>
                          <div className="relative flex-1">
                            <Input
                              type="text"
                              placeholder="Выберите товар..."
                              value={searchTerms[idx] ?? item.matchedProductName ?? ""}
                              onChange={(e) => setSearchTerms({ ...searchTerms, [idx]: e.target.value })}
                              onFocus={() => { if (searchTerms[idx] === undefined) setSearchTerms({ ...searchTerms, [idx]: "" }); }}
                              className={cn(
                                "h-9 text-sm bg-background pr-8",
                                item.matchedProductId && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
                              )}
                            />
                            {item.matchedProductId && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500">✓</span>
                            )}
                            {searchTerms[idx] !== undefined && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                                {preview.availableProducts
                                  .filter(product => product.name.toLowerCase().includes((searchTerms[idx] || "").toLowerCase()))
                                  .slice(0, 10)
                                  .map(product => (
                                    <div
                                      key={product.id}
                                      className="px-3 py-2 hover:bg-primary/10 cursor-pointer text-sm transition-colors"
                                      onClick={() => {
                                        const newItems = [...preview.items];
                                        newItems[idx] = { ...item, matchedProductId: product.id, matchedProductName: product.name, categoryId: product.categoryId, categoryName: product.categoryName, unit: product.defaultUnit || "шт" };
                                        setPreview({ ...preview, items: newItems });
                                        const newSearchTerms = { ...searchTerms };
                                        delete newSearchTerms[idx];
                                        setSearchTerms(newSearchTerms);
                                      }}
                                    >
                                      <span className="font-medium">{product.name}</span>
                                      {product.categoryName && <span className="text-muted-foreground ml-1">({product.categoryName})</span>}
                                    </div>
                                  ))}
                                {preview.availableProducts.filter(p => p.name.toLowerCase().includes((searchTerms[idx] || "").toLowerCase())).length === 0 && (
                                  <div className="px-3 py-2 text-muted-foreground text-sm">Товары не найдены</div>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              setNewProductName(item.receiptName);
                              setNewProductUnit(detectUnit(item.receiptName));
                              setNewProductCategory(detectCategory());
                              setCurrentItemIndex(idx);
                              setShowAddProductModal(true);
                            }}
                            title="Создать новый товар"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Row 2: Quantity, price, total */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
                        {item.isManuallyAdded ? (
                          <>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              value={item.quantity} 
                              onChange={(e) => { 
                                const q = parseFloat(e.target.value) || 0; 
                                const newItems = [...preview.items]; 
                                newItems[idx] = { ...item, quantity: q, total: q * item.pricePerUnit }; 
                                setPreview({ ...preview, items: newItems }); 
                              }} 
                              className="w-16 h-8 text-sm bg-background" 
                            />
                            <select 
                              value={item.unit || "шт"} 
                              onChange={(e) => { 
                                const newItems = [...preview.items]; 
                                newItems[idx] = { ...item, unit: e.target.value }; 
                                setPreview({ ...preview, items: newItems }); 
                              }} 
                              className="h-8 rounded-md border bg-background px-2 text-sm"
                            >
                              <option value="шт">шт</option>
                              <option value="кг">кг</option>
                              <option value="л">л</option>
                              <option value="г">г</option>
                              <option value="мл">мл</option>
                              <option value="упак">упак</option>
                            </select>
                            <span className="text-muted-foreground">×</span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              value={item.pricePerUnit} 
                              onChange={(e) => { 
                                const p = parseFloat(e.target.value) || 0; 
                                const newItems = [...preview.items]; 
                                newItems[idx] = { ...item, pricePerUnit: p, total: item.quantity * p }; 
                                setPreview({ ...preview, items: newItems }); 
                              }} 
                              className="w-20 h-8 text-sm bg-background" 
                            />
                            <span className="text-muted-foreground">₽</span>
                            <span className="text-muted-foreground">=</span>
                            <span className="font-semibold text-sm">{item.total.toFixed(2)} ₽</span>
                            <div className="flex-1" />
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => { 
                                const newItems = preview.items.filter((_, i) => i !== idx); 
                                setPreview({ ...preview, items: newItems }); 
                              }} 
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="bg-muted px-2 py-0.5 rounded text-xs">{item.quantity} {item.unit || "шт"}</span>
                            <span>×</span>
                            <span>{item.pricePerUnit.toFixed(2)} ₽</span>
                            <span>=</span>
                            <span className="font-semibold text-foreground">{item.total.toFixed(2)} ₽</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="px-6 py-4 bg-gradient-to-b from-muted/30 to-muted/50 border-t">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-xs">📊</span>
                  Итого по категориям
                </h4>
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
                  const difference = preview.totalAmount - addedTotal;
                  const isComplete = Math.abs(difference) < 0.01;
                  return (
                    <div className="space-y-2">
                      {Array.from(grouped.entries()).map(([categoryId, items]) => (
                        <div key={categoryId} className="flex items-center justify-between py-1.5 px-3 bg-background/50 rounded-lg">
                          <div>
                            <span className="text-sm font-medium">{items[0]?.categoryName || "Без категории"}</span>
                            <span className="text-xs text-muted-foreground ml-2">({items.length} поз.)</span>
                          </div>
                          <span className="font-semibold">{items.reduce((s, i) => s + i.total, 0).toFixed(2)} ₽</span>
                        </div>
                      ))}
                      
                      <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Сумма по чеку:</span>
                          <span className="font-semibold">{preview.totalAmount.toFixed(2)} ₽</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Распределено:</span>
                          <span className={cn("font-semibold", isComplete ? "text-green-600" : "text-amber-600")}>
                            {addedTotal.toFixed(2)} ₽
                          </span>
                        </div>
                        {!isComplete && (
                          <div className="flex justify-between text-sm">
                            <span className="text-red-500">Разница:</span>
                            <span className="font-semibold text-red-500">{Math.abs(difference).toFixed(2)} ₽</span>
                          </div>
                        )}
                        {isComplete && (
                          <div className="flex items-center gap-2 text-green-600 text-sm font-medium pt-1">
                            <span className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs">✓</span>
                            Все товары распределены!
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-card flex items-center justify-between gap-3">
              <Button variant="outline" onClick={handleCancelPreview} disabled={isProcessing} className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleSaveReceipt} disabled={isProcessing} className="flex-1 bg-gradient-to-r from-primary to-primary/90">
                {isProcessing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <span className="mr-2">✅</span>
                    Создать транзакции
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Галерея */}
      {showGallery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowGallery(false)}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Выбрать из загруженных</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowGallery(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {receipts.length === 0 ? (
                <p className="col-span-3 text-center text-muted-foreground py-8">Нет загруженных чеков</p>
              ) : (
                receipts.map((receipt) => (
                  <div key={receipt.id} className="p-3 border rounded-lg hover:bg-muted cursor-pointer text-center" onClick={() => handleSelectFromGallery(receipt)}>
                    <div className="text-2xl mb-1">{receipt.mime_type.startsWith('image/') ? '🖼️' : '📄'}</div>
                    <div className="text-xs truncate">{receipt.file_name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(receipt.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Добавить товар */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => { setShowAddProductModal(false); setCurrentItemIndex(null); }}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">➕ Добавить новый товар</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowAddProductModal(false); setCurrentItemIndex(null); }}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Название товара:</label>
                <Input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="Введите название..." autoFocus className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Категория:</label>
                <select value={newProductCategory} onChange={(e) => setNewProductCategory(e.target.value)} className="w-full mt-1 h-9 rounded-md border px-3 text-sm">
                  <option value="">Выберите категорию</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Единица измерения:</label>
                <select value={newProductUnit} onChange={(e) => setNewProductUnit(e.target.value)} className="w-full mt-1 h-9 rounded-md border px-3 text-sm">
                  <option value="шт">шт</option><option value="кг">кг</option><option value="г">г</option><option value="мг">мг</option><option value="л">л</option><option value="мл">мл</option><option value="упак">упак</option><option value="рул">рул</option><option value="бут">бут</option><option value="банк">банк</option><option value="пакет">пакет</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => { setShowAddProductModal(false); setCurrentItemIndex(null); }}>Отмена</Button>
                <Button onClick={handleAddProduct} disabled={!newProductName.trim() || !newProductCategory}>✅ Добавить</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
