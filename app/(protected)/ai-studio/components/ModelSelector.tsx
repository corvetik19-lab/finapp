"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Search, ChevronDown, X, Star, Loader2, 
  DollarSign, Gift, Sparkles, RefreshCw 
} from "lucide-react";
import styles from "./ModelSelector.module.css";

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    is_moderated: boolean;
  };
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  compact?: boolean;
}

type FilterType = "all" | "free" | "paid" | "favorites";

const FAVORITES_KEY = "openrouter_favorite_models";

export default function ModelSelector({ value, onChange, compact = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, free: 0, paid: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загрузка избранного из localStorage
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      try {
        setFavorites(new Set(JSON.parse(saved)));
      } catch {
        // ignore
      }
    }
  }, []);

  // Сохранение избранного
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
  }, []);

  // Загрузка моделей
  const loadModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-studio/models");
      if (!res.ok) throw new Error("Ошибка загрузки моделей");
      const data = await res.json();
      setModels(data.models || []);
      setStats({
        total: data.total || 0,
        free: data.free || 0,
        paid: data.paid || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  // Загружаем модели при открытии
  useEffect(() => {
    if (isOpen && models.length === 0) {
      loadModels();
    }
  }, [isOpen, models.length, loadModels]);

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Фильтрация моделей
  const filteredModels = models.filter(model => {
    const matchesSearch = search === "" || 
      model.name.toLowerCase().includes(search.toLowerCase()) ||
      model.id.toLowerCase().includes(search.toLowerCase()) ||
      (model.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    const isFree = parseFloat(model.pricing.prompt) === 0 && 
                   parseFloat(model.pricing.completion) === 0;
    
    const matchesFilter = 
      filter === "all" || 
      (filter === "free" && isFree) ||
      (filter === "paid" && !isFree) ||
      (filter === "favorites" && favorites.has(model.id));
    
    return matchesSearch && matchesFilter;
  });

  const selectedModel = models.find(m => m.id === value);
  const selectedName = selectedModel?.name || value.split("/").pop() || "Выберите модель";

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
    setSearch("");
  };

  const toggleFavorite = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    const newFavorites = new Set(favorites);
    if (newFavorites.has(modelId)) {
      newFavorites.delete(modelId);
    } else {
      newFavorites.add(modelId);
    }
    saveFavorites(newFavorites);
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return "Free";
    if (num < 0.0001) return `$${(num * 1000000).toFixed(2)}/M`;
    return `$${(num * 1000000).toFixed(2)}/M`;
  };

  const isFree = (model: OpenRouterModel) => 
    parseFloat(model.pricing.prompt) === 0 && parseFloat(model.pricing.completion) === 0;

  const getProvider = (modelId: string) => {
    const parts = modelId.split("/");
    return parts[0] || "unknown";
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={`${styles.trigger} ${compact ? styles.compact : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Sparkles size={16} className={styles.triggerIcon} />
        <span className={styles.modelName}>{selectedName}</span>
        <ChevronDown className={`${styles.chevron} ${isOpen ? styles.open : ""}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {/* Header со статистикой */}
          <div className={styles.statsHeader}>
            <span className={styles.statsTotal}>{stats.total} моделей</span>
            <span className={styles.statsFree}>🆓 {stats.free} бесплатных</span>
            <span className={styles.statsPaid}>💎 {stats.paid} платных</span>
            <button className={styles.refreshBtn} onClick={loadModels} title="Обновить">
              <RefreshCw size={14} className={loading ? styles.spinning : ""} />
            </button>
          </div>

          {/* Поиск */}
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск моделей..."
              className={styles.searchInput}
              autoFocus
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Фильтры */}
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filter === "all" ? styles.active : ""}`}
              onClick={() => setFilter("all")}
            >
              Все
            </button>
            <button
              className={`${styles.filterBtn} ${filter === "favorites" ? styles.active : ""}`}
              onClick={() => setFilter("favorites")}
            >
              <Star size={12} /> Избранные ({favorites.size})
            </button>
            <button
              className={`${styles.filterBtn} ${filter === "free" ? styles.active : ""}`}
              onClick={() => setFilter("free")}
            >
              <Gift size={12} /> Бесплатные
            </button>
            <button
              className={`${styles.filterBtn} ${filter === "paid" ? styles.active : ""}`}
              onClick={() => setFilter("paid")}
            >
              <DollarSign size={12} /> Платные
            </button>
          </div>

          {/* Список моделей */}
          <div className={styles.modelsList}>
            {loading ? (
              <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} />
                <span>Загрузка моделей...</span>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <span>{error}</span>
                <button onClick={loadModels}>Повторить</button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className={styles.emptyState}>
                {filter === "favorites" 
                  ? "Нет избранных моделей. Нажмите ★ чтобы добавить."
                  : "Модели не найдены"}
              </div>
            ) : (
              filteredModels.map(model => (
                <div
                  key={model.id}
                  className={`${styles.modelItem} ${model.id === value ? styles.selected : ""}`}
                  onClick={() => handleSelect(model.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSelect(model.id)}
                >
                  <button 
                    className={`${styles.favoriteBtn} ${favorites.has(model.id) ? styles.isFavorite : ""}`}
                    onClick={(e) => toggleFavorite(e, model.id)}
                    title={favorites.has(model.id) ? "Убрать из избранного" : "Добавить в избранное"}
                  >
                    <Star size={14} />
                  </button>
                  
                  <div className={styles.modelInfo}>
                    <div className={styles.modelHeader}>
                      <span className={styles.modelItemName}>{model.name}</span>
                      <span className={styles.provider}>{getProvider(model.id)}</span>
                      {isFree(model) && <span className={styles.freeBadge}>FREE</span>}
                    </div>
                    {model.description && (
                      <span className={styles.modelDesc}>{model.description.slice(0, 80)}...</span>
                    )}
                    <div className={styles.modelMeta}>
                      <span className={styles.context}>
                        {(model.context_length / 1000).toFixed(0)}K ctx
                      </span>
                      <span className={styles.price}>
                        {formatPrice(model.pricing.prompt)} in • {formatPrice(model.pricing.completion)} out
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.footer}>
            <Sparkles size={14} />
            <span>OpenRouter • {filteredModels.length} из {stats.total} моделей</span>
          </div>
        </div>
      )}
    </div>
  );
}
