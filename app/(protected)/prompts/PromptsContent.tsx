"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./Prompts.module.css";
import PromptCard from "./PromptCard";
import PromptModal from "./PromptModal";

type Prompt = {
  id: string;
  title: string;
  description: string | null;
  prompt_text: string;
  category: string | null;
  tags: string[];
  ai_model: string;
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  last_used_at: string | null;
};

export default function PromptsContent() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAiModel, setSelectedAiModel] = useState<string>("all");
  const [showFavorites, setShowFavorites] = useState(false);

  const categories = ["Работа", "Творчество", "Обучение", "Программирование", "Маркетинг", "Другое"];
  const aiModels = ["Universal", "ChatGPT", "Claude", "Gemini", "Midjourney"];

  const filterPrompts = useCallback(() => {
    let filtered = [...prompts];

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.prompt_text.toLowerCase().includes(query) ||
          p.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Категория
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // AI модель
    if (selectedAiModel !== "all") {
      filtered = filtered.filter((p) => p.ai_model === selectedAiModel);
    }

    // Избранное
    if (showFavorites) {
      filtered = filtered.filter((p) => p.is_favorite);
    }

    setFilteredPrompts(filtered);
  }, [prompts, searchQuery, selectedCategory, selectedAiModel, showFavorites]);

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    filterPrompts();
  }, [filterPrompts]);

  async function loadPrompts() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/prompts");
      const data = await res.json();
      
      if (res.ok) {
        setPrompts(data.prompts || []);
      } else {
        console.error("Error loading prompts:", data.error);
      }
    } catch (error) {
      console.error("Load prompts error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreate() {
    setEditingPrompt(null);
    setIsModalOpen(true);
  }

  function handleEdit(prompt: Prompt) {
    setEditingPrompt(prompt);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить этот промпт?")) return;

    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadPrompts();
      } else {
        const data = await res.json();
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Ошибка при удалении");
    }
  }

  async function handleToggleFavorite(id: string, isFavorite: boolean) {
    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !isFavorite }),
      });

      if (res.ok) {
        await loadPrompts();
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      
      // Увеличить счётчик использований
      await fetch(`/api/prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment_usage: true }),
      });

      await loadPrompts();
    } catch (error) {
      console.error("Copy error:", error);
    }
  }

  function handleModalClose() {
    setIsModalOpen(false);
    setEditingPrompt(null);
    loadPrompts();
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            <span className={styles.icon}>💡</span>
            Промпты
          </h1>
          <p className={styles.subtitle}>
            Библиотека промптов для нейросетей
          </p>
        </div>
        <button onClick={handleCreate} className={styles.createBtn}>
          <span className="material-icons">add</span>
          Создать промпт
        </button>
      </header>

      {/* Фильтры */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Поиск по названию, описанию, тегам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterRow}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.select}
          >
            <option value="all">Все категории</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedAiModel}
            onChange={(e) => setSelectedAiModel(e.target.value)}
            className={styles.select}
          >
            <option value="all">Все модели</option>
            {aiModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`${styles.filterBtn} ${showFavorites ? styles.active : ""}`}
          >
            <span className="material-icons">
              {showFavorites ? "star" : "star_border"}
            </span>
            Избранное
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{prompts.length}</span>
          <span className={styles.statLabel}>Всего промптов</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {prompts.filter((p) => p.is_favorite).length}
          </span>
          <span className={styles.statLabel}>Избранных</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {prompts.reduce((sum, p) => sum + p.usage_count, 0)}
          </span>
          <span className={styles.statLabel}>Использований</span>
        </div>
      </div>

      {/* Список промптов */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка промптов...</p>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📝</span>
          <h3>Промпты не найдены</h3>
          <p>
            {searchQuery || selectedCategory !== "all" || selectedAiModel !== "all" || showFavorites
              ? "Попробуйте изменить фильтры"
              : "Создайте свой первый промпт"}
          </p>
          {!searchQuery && selectedCategory === "all" && selectedAiModel === "all" && !showFavorites && (
            <button onClick={handleCreate} className={styles.emptyBtn}>
              Создать промпт
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}

      {/* Модальное окно */}
      {isModalOpen && (
        <PromptModal
          prompt={editingPrompt}
          onClose={handleModalClose}
          categories={categories}
          aiModels={aiModels}
        />
      )}
    </div>
  );
}
