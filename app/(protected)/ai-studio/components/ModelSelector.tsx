"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Sparkles, X } from "lucide-react";
import styles from "./ModelSelector.module.css";

interface Model {
  id: string;
  name: string;
  description: string;
  isNew?: boolean;
}

// Только текстовые модели Gemini (изображения/видео/аудио в Kie.ai)
const GEMINI_MODELS: Model[] = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash", description: "Новейшая: рассуждения 3 Pro + скорость Flash", isNew: true },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro", description: "Лучшая для мультимодального понимания", isNew: true },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Продвинутое мышление для сложных задач" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Быстрая и эффективная" },
  { id: "gemini-2.5-flash-lite-preview", name: "Gemini 2.5 Flash-Lite", description: "Сверхбыстрая для простых задач" },
];

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  compact?: boolean;
}

export default function ModelSelector({ value, onChange, compact = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = GEMINI_MODELS.find(m => m.id === value) || GEMINI_MODELS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredModels = GEMINI_MODELS.filter(model => {
    return model.name.toLowerCase().includes(search.toLowerCase()) ||
           model.description.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={`${styles.trigger} ${compact ? styles.compact : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Sparkles className={styles.geminiIcon} />
        <span className={styles.modelName}>{selectedModel.name}</span>
        <ChevronDown className={`${styles.chevron} ${isOpen ? styles.open : ""}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Быстрый поиск моделей"
              className={styles.searchInput}
              autoFocus
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.modelsList}>
            {filteredModels.map(model => (
              <button
                key={model.id}
                className={`${styles.modelItem} ${model.id === value ? styles.selected : ""}`}
                onClick={() => handleSelect(model.id)}
              >
                <div className={styles.modelInfo}>
                  <div className={styles.modelHeader}>
                    <span className={styles.modelItemName}>{model.name}</span>
                    {model.isNew && <span className={styles.newBadge}>Новинка</span>}
                  </div>
                  <span className={styles.modelDesc}>{model.description}</span>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.footer}>
            <Sparkles size={14} />
            <span>Powered by Google Gemini AI</span>
          </div>
        </div>
      )}
    </div>
  );
}
