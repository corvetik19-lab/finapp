"use client";

import { useState, useEffect, useCallback } from "react";
import BookmarkCard from "./BookmarkCard";
import BookmarkModal from "./BookmarkModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Star, Loader2, Bookmark } from "lucide-react";

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Bookmark className="h-6 w-6" />Закладки</h1><p className="text-muted-foreground">Сохранённые ссылки и ресурсы</p></div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все категории</SelectItem>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>
        <Button variant={showFavorites ? "default" : "outline"} onClick={() => setShowFavorites(!showFavorites)}><Star className={`h-4 w-4 mr-1 ${showFavorites ? "fill-current" : ""}`} />Избранное</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">{bookmarks.length}</p><p className="text-sm text-muted-foreground">Всего</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">{bookmarks.filter((b) => b.is_favorite).length}</p><p className="text-sm text-muted-foreground">Избранных</p></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-12"><Loader2 className="h-8 w-8 animate-spin" /><p className="text-muted-foreground mt-2">Загрузка...</p></div>
      ) : filteredBookmarks.length === 0 ? (
        <Card className="text-center py-12"><CardContent><Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold">Закладки не найдены</h3><p className="text-muted-foreground mb-4">{searchQuery || selectedCategory !== "all" || showFavorites ? "Измените фильтры" : "Добавьте первую закладку"}</p>{!searchQuery && selectedCategory === "all" && !showFavorites && <Button onClick={handleCreate}>Добавить</Button>}</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookmarks.map((bookmark) => <BookmarkCard key={bookmark.id} bookmark={bookmark} onEdit={handleEdit} onDelete={handleDelete} onToggleFavorite={handleToggleFavorite} onVisit={handleVisit} />)}
        </div>
      )}

      {isModalOpen && <BookmarkModal bookmark={editingBookmark} onClose={handleModalClose} categories={categories} />}
    </div>
  );
}
