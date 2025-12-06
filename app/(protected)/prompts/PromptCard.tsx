"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Copy, Check, Edit, Trash2, Clock } from "lucide-react";

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

type Props = {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onCopy: (text: string, id: string) => void;
};

export default function PromptCard({
  prompt,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
}: Props) {
  const [showFullText, setShowFullText] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy(prompt.prompt_text, prompt.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAiModelIcon = (model: string) => {
    switch (model) {
      case "ChatGPT":
        return "🤖";
      case "Claude":
        return "🧠";
      case "Gemini":
        return "✨";
      case "Midjourney":
        return "🎨";
      default:
        return "🌐";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{prompt.title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleFavorite(prompt.id, prompt.is_favorite)}>
            <Star className={`h-4 w-4 ${prompt.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
        </div>
        {prompt.description && <p className="text-sm text-muted-foreground">{prompt.description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`text-sm bg-muted/50 p-3 rounded-lg ${showFullText ? "" : "line-clamp-3"}`}>{prompt.prompt_text}</div>
        {prompt.prompt_text.length > 200 && <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setShowFullText(!showFullText)}>{showFullText ? "Свернуть" : "Показать полностью"}</Button>}
        <div className="flex flex-wrap gap-1">
          <Badge>{getAiModelIcon(prompt.ai_model)} {prompt.ai_model}</Badge>
          {prompt.category && <Badge variant="secondary">{prompt.category}</Badge>}
          {prompt.tags.map((tag, i) => <Badge key={i} variant="outline" className="text-xs">#{tag}</Badge>)}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Copy className="h-3 w-3" />{prompt.usage_count}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(prompt.created_at).toLocaleDateString("ru-RU")}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleCopy}>{copied ? <><Check className="h-4 w-4 mr-1" />Скопировано</> : <><Copy className="h-4 w-4 mr-1" />Копировать</>}</Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(prompt)}><Edit className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(prompt.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
