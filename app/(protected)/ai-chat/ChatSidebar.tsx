"use client";

import { useState, useEffect } from "react";
import styles from "./ChatSidebar.module.css";
import { getChatsAction, deleteChatAction, updateChatTitleAction } from "./actions";
import type { AiChat } from "@/lib/ai/chat-types";

type ChatSidebarProps = {
  currentChatId: string | null;
  onSelectChat: (chatId: string | null) => void;
  onNewChat: () => void;
  refreshKey?: number;
};

export default function ChatSidebar({
  currentChatId,
  onSelectChat,
  onNewChat,
  refreshKey = 0,
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
    <div className={styles.sidebar}>
      {/* Заголовок и кнопки */}
      <div className={styles.header}>
        <h2 className={styles.title}>Чаты</h2>
        <div className={styles.headerButtons}>
          {!isSelectionMode && (
            <button
              onClick={onNewChat}
              className={styles.newChatBtn}
              title="Новый чат"
            >
              <span className="material-icons">add</span>
            </button>
          )}
          <button
            onClick={toggleSelectionMode}
            className={`${styles.newChatBtn} ${isSelectionMode ? styles.activeMode : ''}`}
            title={isSelectionMode ? "Отменить" : "Выбрать"}
          >
            <span className="material-icons">
              {isSelectionMode ? "close" : "checklist"}
            </span>
          </button>
        </div>
      </div>

      {/* Панель массовых действий */}
      {isSelectionMode && (
        <div className={styles.selectionBar}>
          <div className={styles.selectionInfo}>
            <span>Выбрано: {selectedChats.size}</span>
          </div>
          <div className={styles.selectionActions}>
            {selectedChats.size === filteredChats.length ? (
              <button onClick={deselectAll} className={styles.selectBtn}>
                Снять все
              </button>
            ) : (
              <button onClick={selectAll} className={styles.selectBtn}>
                Выбрать все
              </button>
            )}
            <button
              onClick={handleBulkDelete}
              className={styles.deleteBulkBtn}
              disabled={selectedChats.size === 0}
            >
              <span className="material-icons">delete</span>
              Удалить ({selectedChats.size})
            </button>
          </div>
        </div>
      )}

      {/* Поиск */}
      <div className={styles.searchBox}>
        <span className="material-icons" style={{ fontSize: 20 }}>
          search
        </span>
        <input
          type="text"
          placeholder="Поиск по чатам..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className={styles.clearBtn}
            title="Очистить"
          >
            <span className="material-icons" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        )}
      </div>

      {/* Список чатов */}
      <div className={styles.chatList}>
        {isLoading ? (
          <div className={styles.loading}>
            <span className="material-icons spinning">refresh</span>
            <p>Загрузка...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className={styles.empty}>
            <span className="material-icons">chat_bubble_outline</span>
            <p>
              {searchQuery ? "Ничего не найдено" : "Нет чатов"}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`${styles.chatItem} ${
                chat.id === currentChatId && !isSelectionMode ? styles.active : ""
              } ${selectedChats.has(chat.id) ? styles.selected : ""}`}
              onClick={() => 
                isSelectionMode 
                  ? toggleChatSelection(chat.id) 
                  : onSelectChat(chat.id)
              }
            >
              {/* Чекбокс в режиме выбора */}
              {isSelectionMode && (
                <div className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={selectedChats.has(chat.id)}
                    onChange={() => toggleChatSelection(chat.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              <div className={styles.chatIcon}>
                <span className="material-icons">chat</span>
              </div>
              
              {/* Название чата - редактируемое или обычное */}
              {editingChatId === chat.id ? (
                <div className={styles.chatInfo}>
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => handleEditKeyDown(e, chat.id)}
                    onBlur={() => saveEdit(chat.id)}
                    className={styles.editInput}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className={styles.editButtons}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEdit(chat.id);
                      }}
                      className={styles.saveBtn}
                      title="Сохранить"
                    >
                      <span className="material-icons">check</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEdit();
                      }}
                      className={styles.cancelBtn}
                      title="Отменить"
                    >
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.chatInfo}>
                  <div className={styles.chatTitle}>{chat.title}</div>
                  <div className={styles.chatDate}>
                    {formatDate(chat.updated_at)}
                  </div>
                </div>
              )}

              {/* Кнопки действий (скрыты в режиме выбора и редактирования) */}
              {!isSelectionMode && editingChatId !== chat.id && (
                <div className={styles.chatActions}>
                  <button
                    onClick={(e) => startEdit(chat.id, chat.title, e)}
                    className={styles.editBtn}
                    title="Редактировать"
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button
                    onClick={(e) => handleDelete(chat.id, e)}
                    className={styles.deleteBtn}
                    title="Удалить чат"
                  >
                    <span className="material-icons">delete</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
