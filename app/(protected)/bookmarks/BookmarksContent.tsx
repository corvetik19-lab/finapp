"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./Bookmarks.module.css";
import BookmarkCard from "./BookmarkCard";
import BookmarkModal from "./BookmarkModal";

type Bookmark = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  tags: string[];
  is_favorite: boolean;
  favicon_url: string | null;
  visit_count: number;
  created_at: string;
  last_visited_at: string | null;
};

export default function BookmarksContent() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  
  // Фильтры
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFavorites, setShowFavorites] = useState(false);

  const categories = ["Работа", "Обучение", "Развлечения", "Инструменты", "Соцсети", "Другое"];

  useEffect(() => {
    loadBookmarks();
  }, []);

  const filterBookmarks = useCallback(() => {
    let filtered = [...bookmarks];

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(query) ||
          b.description?.toLowerCase().includes(query) ||
          b.url.toLowerCase().includes(query) ||
          b.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Категория
    if (selectedCategory !== "all") {
      filtered = filtered.filter((b) => b.category === selectedCategory);
    }

    // Избранное
    if (showFavorites) {
      filtered = filtered.filter((b) => b.is_favorite);
    }

    setFilteredBookmarks(filtered);
  }, [bookmarks, searchQuery, selectedCategory, showFavorites]);

  useEffect(() => {
    filterBookmarks();
  }, [filterBookmarks]);

  async function loadBookmarks() {
    try {
      setIsLoading(true);
      const res = await fetch("/api/bookmarks");
      const data = await res.json();
      
      if (res.ok) {
        setBookmarks(data.bookmarks || []);
      } else {
        console.error("Error loading bookmarks:", data.error);
      }
    } catch (error) {
      console.error("Load bookmarks error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreate() {
    setEditingBookmark(null);
    setIsModalOpen(true);
  }

  function handleEdit(bookmark: Bookmark) {
    setEditingBookmark(bookmark);
    setIsModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить эту закладку?")) return;

    // Оптимистичное удаление - сразу убираем из UI
    const deletedBookmark = bookmarks.find((b) => b.id === id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));

    try {
      const res = await fetch(`/api/bookmarks/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Откатываем удаление при ошибке
        if (deletedBookmark) {
          setBookmarks((prev) => [...prev, deletedBookmark]);
        }
        const data = await res.json();
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      // Откатываем удаление при ошибке
      if (deletedBookmark) {
        setBookmarks((prev) => [...prev, deletedBookmark]);
      }
      console.error("Delete error:", error);
      alert("Ошибка при удалении");
    }
  }

  async function handleToggleFavorite(id: string, isFavorite: boolean) {
    // Оптимистичное обновление - сразу обновляем UI
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, is_favorite: !isFavorite } : b
      )
    );

    try {
      const res = await fetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: !isFavorite }),
      });

      if (!res.ok) {
        // Откатываем изменения при ошибке
        setBookmarks((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, is_favorite: isFavorite } : b
          )
        );
        const data = await res.json();
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      // Откатываем изменения при ошибке
      setBookmarks((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, is_favorite: isFavorite } : b
        )
      );
      console.error("Toggle favorite error:", error);
    }
  }

  async function handleVisit(url: string, id: string) {
    try {
      // Открыть ссылку в новой вкладке
      window.open(url, "_blank", "noopener,noreferrer");

      // Увеличить счётчик посещений в фоне
      fetch(`/api/bookmarks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment_visits: true }),
      });
    } catch (error) {
      console.error("Visit error:", error);
    }
  }

  async function handleModalClose(updatedBookmark?: Bookmark) {
    setIsModalOpen(false);
    setEditingBookmark(null);
    
    if (updatedBookmark) {
      // Оптимистичное обновление - обновляем только изменённую закладку
      setBookmarks((prev) =>
        prev.map((b) => (b.id === updatedBookmark.id ? updatedBookmark : b))
      );
    } else {
      // Если новая закладка - перезагружаем список
      await loadBookmarks();
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>
            <span className={styles.icon}>🔖</span>
            Закладки
          </h1>
          <p className={styles.subtitle}>
            Сохранённые ссылки и полезные ресурсы
          </p>
        </div>
        <button onClick={handleCreate} className={styles.createBtn}>
          <span className="material-icons">add</span>
          Добавить закладку
        </button>
      </header>

      {/* Фильтры */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <span className="material-icons">search</span>
          <input
            type="text"
            placeholder="Поиск по названию, описанию, URL, тегам..."
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
          <span className={styles.statValue}>{bookmarks.length}</span>
          <span className={styles.statLabel}>Всего закладок</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {bookmarks.filter((b) => b.is_favorite).length}
          </span>
          <span className={styles.statLabel}>Избранных</span>
        </div>
      </div>

      {/* Список закладок */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка закладок...</p>
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔖</span>
          <h3>Закладки не найдены</h3>
          <p>
            {searchQuery || selectedCategory !== "all" || showFavorites
              ? "Попробуйте изменить фильтры"
              : "Добавьте свою первую закладку"}
          </p>
          {!searchQuery && selectedCategory === "all" && !showFavorites && (
            <button onClick={handleCreate} className={styles.emptyBtn}>
              Добавить закладку
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredBookmarks.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              onVisit={handleVisit}
            />
          ))}
        </div>
      )}

      {/* Модальное окно */}
      {isModalOpen && (
        <BookmarkModal
          bookmark={editingBookmark}
          onClose={handleModalClose}
          categories={categories}
        />
      )}
    </div>
  );
}
