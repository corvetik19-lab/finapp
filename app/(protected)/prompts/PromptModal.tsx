"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type Prompt = {
  id: string;
  title: string;
  description: string | null;
  prompt_text: string;
  category: string | null;
  tags: string[];
  ai_model: string;
  is_favorite: boolean;
};

type Props = {
  prompt: Prompt | null;
  onClose: () => void;
  categories: string[];
  aiModels: string[];
};

export default function PromptModal({ prompt, onClose, categories, aiModels }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [category, setCategory] = useState("");
  const [aiModel, setAiModel] = useState("Universal");
  const [tagsInput, setTagsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setDescription(prompt.description || "");
      setPromptText(prompt.prompt_text);
      setCategory(prompt.category || "");
      setAiModel(prompt.ai_model);
      setTagsInput(prompt.tags.join(", "));
    }
  }, [prompt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !promptText.trim()) {
      alert("Заполните название и текст промпта");
      return;
    }

    setIsSaving(true);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      const body = {
        title: title.trim(),
        description: description.trim() || null,
        prompt_text: promptText.trim(),
        category: category || null,
        tags,
        ai_model: aiModel,
      };

      const url = prompt ? `/api/prompts/${prompt.id}` : "/api/prompts";
      const method = prompt ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onClose();
      } else {
        const data = await res.json();
        alert(`Ошибка: ${data.error}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{prompt ? "Редактировать промпт" : "Создать промпт"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Название *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Генерация идей для статьи" required /></div>
          <div className="space-y-2"><Label>Описание</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Краткое описание..." rows={2} /></div>
          <div className="space-y-2"><Label>Текст промпта *</Label><Textarea value={promptText} onChange={(e) => setPromptText(e.target.value)} placeholder="Введите текст промпта..." rows={8} required /><p className="text-xs text-muted-foreground text-right">{promptText.length} символов</p></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Категория</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Не выбрано" /></SelectTrigger><SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Нейросеть</Label><Select value={aiModel} onValueChange={setAiModel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{aiModels.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Теги</Label><Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="идеи, контент, маркетинг" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Отмена</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : prompt ? "Сохранить" : "Создать"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
