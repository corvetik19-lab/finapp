"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Link as LinkIcon, ExternalLink, Edit, Trash2 } from "lucide-react";

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
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onVisit: (url: string, id: string) => void;
};

export default function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  onToggleFavorite,
  onVisit,
}: Props) {
  const [imageError, setImageError] = useState(false);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const getFaviconUrl = () => {
    if (bookmark.favicon_url && !imageError) {
      return bookmark.favicon_url;
    }
    try {
      const domain = new URL(bookmark.url).origin;
      return `${domain}/favicon.ico`;
    } catch {
      return null;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getFaviconUrl() && <Image src={getFaviconUrl()!} alt="" width={20} height={20} className="rounded" onError={() => setImageError(true)} unoptimized />}
            <CardTitle className="text-base">{bookmark.title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleFavorite(bookmark.id, bookmark.is_favorite)}>
            <Star className={`h-4 w-4 ${bookmark.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
          </Button>
        </div>
        {bookmark.description && <p className="text-sm text-muted-foreground mt-1">{bookmark.description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <button onClick={() => onVisit(bookmark.url, bookmark.id)} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <LinkIcon className="h-3 w-3" />{getDomain(bookmark.url)}
        </button>
        <div className="flex flex-wrap gap-1">
          {bookmark.category && <Badge variant="secondary">{bookmark.category}</Badge>}
          {bookmark.tags.map((tag, i) => <Badge key={i} variant="outline" className="text-xs">#{tag}</Badge>)}
        </div>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => onVisit(bookmark.url, bookmark.id)}><ExternalLink className="h-4 w-4 mr-1" />Открыть</Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(bookmark)}><Edit className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(bookmark.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
