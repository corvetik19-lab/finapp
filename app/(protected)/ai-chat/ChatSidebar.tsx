"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, Search, X, MessageCircle, Edit, Trash2, Check, RefreshCw, List } from "lucide-react";
import { getChatsAction, deleteChatAction, updateChatTitleAction } from "./actions";
import type { AiChat } from "@/lib/ai/chat-types";

type ChatSidebarProps = {
  currentChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
  onNewChat: () => void;
  refreshKey?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export default function ChatSidebar({
  currentChatId,
  onSelectChat,
  onNewChat,
  refreshKey = 0,
  isCollapsed = false,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [chats, setChats] = useState<AiChat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Загружаем список чатов при монтировании, изменении текущего чата или refreshKey
  useEffect(() => {
    // Небольшая задержка чтобы дать чату сохраниться в БД
    const timer = setTimeout(() => {
      loadChats();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentChatId, refreshKey]); // Обновляем список когда меняется текущий чат или refreshKey

  const loadChats = async () => {
    setIsLoading(true);
    try {
      const data = await getChatsAction();
      setChats(data);
    } catch (error) {
      console.error("Failed to load chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтрация чатов по поисковому запросу
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Переключение режима выбора
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedChats(new Set());
  };

  // Переключение выбора чата
  const toggleChatSelection = (chatId: string) => {
    const newSelected = new Set(selectedChats);
    if (newSelected.has(chatId)) {
      newSelected.delete(chatId);
    } else {
      newSelected.add(chatId);
    }
    setSelectedChats(newSelected);
  };

  // Выбрать все чаты
  const selectAll = () => {
    const allIds = new Set(filteredChats.map(chat => chat.id));
    setSelectedChats(allIds);
  };

  // Снять все выборы
  const deselectAll = () => {
    setSelectedChats(new Set());
  };

  // Массовое удаление выбранных чатов
  const handleBulkDelete = async () => {
    if (selectedChats.size === 0) return;

    if (!confirm(`Вы уверены, что хотите удалить ${selectedChats.size} чат(ов)?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedChats).map(chatId => 
        deleteChatAction(chatId)
      );
      
      await Promise.all(deletePromises);
      
      // Если удалили текущий чат, сбрасываем выбор
      if (currentChatId && selectedChats.has(currentChatId)) {
        onSelectChat(null);
      }
      
      // Сбрасываем режим выбора и обновляем список
      setIsSelectionMode(false);
      setSelectedChats(new Set());
      await loadChats();
    } catch (error) {
      console.error("Failed to delete chats:", error);
      alert("Не удалось удалить некоторые чаты");
    }
  };

  // Начать редактирование названия чата
  const startEdit = (chatId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle);
  };

  // Отменить редактирование
  const cancelEdit = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  // Сохранить новое название
  const saveEdit = async (chatId: string) => {
    if (!editingTitle.trim()) {
      cancelEdit();
      return;
    }

    try {
      const success = await updateChatTitleAction(chatId, editingTitle.trim());
      if (success) {
        await loadChats();
        cancelEdit();
      }
    } catch (error) {
      console.error("Failed to update chat title:", error);
      alert("Не удалось обновить название чата");
    }
  };

  // Обработка Enter и Escape при редактировании
  const handleEditKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(chatId);
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  // Удаление одного чата
  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем выбор чата при клике на удаление

    if (!confirm("Вы уверены, что хотите удалить этот чат?")) {
      return;
    }

    try {
      const success = await deleteChatAction(chatId);
      if (success) {
        // Если удалили текущий чат, сбрасываем выбор
        if (chatId === currentChatId) {
          onSelectChat(null);
        }
        // Обновляем список чатов
        await loadChats();
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      alert("Не удалось удалить чат");
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Вчера";
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      });
    }
  };

  return (
    <div className={cn("border-r bg-muted/30 flex flex-col transition-all", isCollapsed ? "w-12" : "w-72")}>
      {onToggleCollapse && (
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={onToggleCollapse}>
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      )}

      {!isCollapsed && (
        <>
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-semibold">Чаты</h2>
            <div className="flex gap-1">
              {!isSelectionMode && <Button size="icon" variant="ghost" onClick={onNewChat} title="Новый чат"><Plus className="h-4 w-4" /></Button>}
              <Button size="icon" variant={isSelectionMode ? "secondary" : "ghost"} onClick={toggleSelectionMode} title={isSelectionMode ? "Отменить" : "Выбрать"}>
                {isSelectionMode ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {isSelectionMode && (
            <div className="p-2 border-b bg-muted/50 flex items-center justify-between text-sm">
              <span>Выбрано: {selectedChats.size}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={selectedChats.size === filteredChats.length ? deselectAll : selectAll}>
                  {selectedChats.size === filteredChats.length ? "Снять" : "Все"}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={selectedChats.size === 0}>
                  <Trash2 className="h-4 w-4 mr-1" />{selectedChats.size}
                </Button>
              </div>
            </div>
          )}

          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8" />
              {searchQuery && <Button size="icon" variant="ghost" className="absolute right-0 top-0 h-8 w-8" onClick={() => setSearchQuery("")}><X className="h-4 w-4" /></Button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><RefreshCw className="h-5 w-5 animate-spin" /><p className="text-sm mt-2">Загрузка...</p></div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><MessageCircle className="h-8 w-8" /><p className="text-sm mt-2">{searchQuery ? "Ничего не найдено" : "Нет чатов"}</p></div>
            ) : (
              filteredChats.map((chat) => (
                <div key={chat.id} className={cn("flex items-center gap-2 p-2 mx-2 my-1 rounded-md cursor-pointer hover:bg-muted group", chat.id === currentChatId && !isSelectionMode && "bg-muted", selectedChats.has(chat.id) && "bg-primary/10")} onClick={() => isSelectionMode ? toggleChatSelection(chat.id) : onSelectChat(chat.id)}>
                  {isSelectionMode && <Checkbox checked={selectedChats.has(chat.id)} onCheckedChange={() => toggleChatSelection(chat.id)} onClick={(e) => e.stopPropagation()} />}
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  {editingChatId === chat.id ? (
                    <div className="flex-1 flex items-center gap-1">
                      <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} onKeyDown={(e) => handleEditKeyDown(e, chat.id)} onBlur={() => saveEdit(chat.id)} autoFocus onClick={(e) => e.stopPropagation()} className="h-7 text-sm" />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); saveEdit(chat.id); }}><Check className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); cancelEdit(); }}><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{chat.title}</div><div className="text-xs text-muted-foreground">{formatDate(chat.updated_at)}</div></div>
                      {!isSelectionMode && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => startEdit(chat.id, chat.title, e)}><Edit className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => handleDelete(chat.id, e)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
