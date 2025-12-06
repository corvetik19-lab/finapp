"use client";

import { useState, useEffect, useCallback } from "react";
import PromptCard from "./PromptCard";
import PromptModal from "./PromptModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Star, Loader2, Lightbulb } from "lucide-react";

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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold flex items-center gap-2"><Lightbulb className="h-6 w-6" />Промпты</h1><p className="text-muted-foreground">Библиотека промптов для нейросетей</p></div>
        <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />Создать</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}><SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все категории</SelectItem>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>
        <Select value={selectedAiModel} onValueChange={setSelectedAiModel}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Все модели</SelectItem>{aiModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Button variant={showFavorites ? "default" : "outline"} onClick={() => setShowFavorites(!showFavorites)}><Star className={`h-4 w-4 mr-1 ${showFavorites ? "fill-current" : ""}`} />Избранное</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">{prompts.length}</p><p className="text-sm text-muted-foreground">Всего</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">{prompts.filter((p) => p.is_favorite).length}</p><p className="text-sm text-muted-foreground">Избранных</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-3xl font-bold">{prompts.reduce((sum, p) => sum + p.usage_count, 0)}</p><p className="text-sm text-muted-foreground">Использований</p></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-12"><Loader2 className="h-8 w-8 animate-spin" /><p className="text-muted-foreground mt-2">Загрузка...</p></div>
      ) : filteredPrompts.length === 0 ? (
        <Card className="text-center py-12"><CardContent><Lightbulb className="h-16 w-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold">Промпты не найдены</h3><p className="text-muted-foreground mb-4">{searchQuery || selectedCategory !== "all" || selectedAiModel !== "all" || showFavorites ? "Измените фильтры" : "Создайте первый промпт"}</p>{!searchQuery && selectedCategory === "all" && selectedAiModel === "all" && !showFavorites && <Button onClick={handleCreate}>Создать</Button>}</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => <PromptCard key={prompt.id} prompt={prompt} onEdit={handleEdit} onDelete={handleDelete} onToggleFavorite={handleToggleFavorite} onCopy={handleCopy} />)}
        </div>
      )}

      {isModalOpen && <PromptModal prompt={editingPrompt} onClose={handleModalClose} categories={categories} aiModels={aiModels} />}
    </div>
  );
}
