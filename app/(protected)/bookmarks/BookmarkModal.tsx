"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

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

type Props = {
  bookmark: Bookmark | null;
  onClose: (updatedBookmark?: Bookmark) => void;
  categories: string[];
};

export default function BookmarkModal({ bookmark, onClose, categories }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setUrl(bookmark.url);
      setDescription(bookmark.description || "");
      setCategory(bookmark.category || "");
      setTagsInput(bookmark.tags.join(", "));
    }
  }, [bookmark]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !url.trim()) {
      alert("Заполните название и URL");
      return;
    }

    setIsSaving(true);

    try {
      // Нормализация URL - добавить http:// если нет протокола
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'http://' + normalizedUrl;
      }

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      // Попытка получить favicon
      let favicon_url = null;
      try {
        const domain = new URL(normalizedUrl).origin;
        favicon_url = `${domain}/favicon.ico`;
      } catch {
        // Игнорируем ошибку
      }

      const body = {
        title: title.trim(),
        url: normalizedUrl,
        description: description.trim() || null,
        category: category || null,
        tags,
        favicon_url,
      };

      const apiUrl = bookmark ? `/api/bookmarks/${bookmark.id}` : "/api/bookmarks";
      const method = bookmark ? "PATCH" : "POST";

      const res = await fetch(apiUrl, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        onClose(data.bookmark);
      } else {
        const errorData = await res.json();
        alert(`Ошибка: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{bookmark ? "Редактировать закладку" : "Добавить закладку"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Название *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Google Документы" required /></div>
          <div className="space-y-2"><Label>URL *</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="example.com" required /><p className="text-xs text-muted-foreground">https:// добавится автоматически</p></div>
          <div className="space-y-2"><Label>Описание</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание..." rows={3} /></div>
          <div className="space-y-2"><Label>Категория</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Не выбрано" /></SelectTrigger><SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Теги</Label><Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="работа, документы, облако" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()} disabled={isSaving}>Отмена</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : bookmark ? "Сохранить" : "Добавить"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
