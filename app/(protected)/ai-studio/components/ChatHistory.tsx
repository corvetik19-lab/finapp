"use client";

import { useState } from "react";
import { MessageSquare, MoreHorizontal, Trash2, Edit2, ChevronDown, ChevronRight } from "lucide-react";
import styles from "./ChatHistory.module.css";

interface ChatItem {
  id: string;
  title: string;
  date: Date;
  model: string;
}

interface ChatHistoryProps {
  chats: ChatItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
}

function groupChatsByDate(chats: ChatItem[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const groups: { label: string; chats: ChatItem[] }[] = [
    { label: "Сегодня", chats: [] },
    { label: "Вчера", chats: [] },
    { label: "На этой неделе", chats: [] },
    { label: "В этом месяце", chats: [] },
    { label: "Ранее", chats: [] },
  ];

  chats.forEach(chat => {
    const chatDate = new Date(chat.date);
    chatDate.setHours(0, 0, 0, 0);

    if (chatDate.getTime() === today.getTime()) {
      groups[0].chats.push(chat);
    } else if (chatDate.getTime() === yesterday.getTime()) {
      groups[1].chats.push(chat);
    } else if (chatDate >= weekAgo) {
      groups[2].chats.push(chat);
    } else if (chatDate >= monthAgo) {
      groups[3].chats.push(chat);
    } else {
      groups[4].chats.push(chat);
    }
  });

  return groups.filter(g => g.chats.length > 0);
}

export default function ChatHistory({ chats, activeId, onSelect, onDelete, onRename }: ChatHistoryProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Сегодня", "Вчера"]));
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const groups = groupChatsByDate(chats);

  const toggleGroup = (label: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedGroups(newExpanded);
  };

  const handleStartEdit = (chat: ChatItem) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
    setMenuOpenId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (onRename && editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (onDelete) {
      onDelete(id);
    }
    setMenuOpenId(null);
  };

  if (chats.length === 0) {
    return (
      <div className={styles.empty}>
        <MessageSquare className={styles.emptyIcon} />
        <p>Здесь будет история диалогов</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {groups.map(group => (
        <div key={group.label} className={styles.group}>
          <button
            className={styles.groupHeader}
            onClick={() => toggleGroup(group.label)}
          >
            {expandedGroups.has(group.label) ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            <span>{group.label}</span>
            <span className={styles.count}>{group.chats.length}</span>
          </button>

          {expandedGroups.has(group.label) && (
            <div className={styles.chatList}>
              {group.chats.map(chat => (
                <div
                  key={chat.id}
                  className={`${styles.chatItem} ${chat.id === activeId ? styles.active : ""}`}
                >
                  {editingId === chat.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveEdit(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(chat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className={styles.editInput}
                      autoFocus
                    />
                  ) : (
                    <>
                      <button
                        className={styles.chatButton}
                        onClick={() => onSelect(chat.id)}
                      >
                        <span className={styles.chatTitle}>{chat.title}</span>
                      </button>
                      <button
                        className={styles.menuBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === chat.id ? null : chat.id);
                        }}
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </>
                  )}

                  {menuOpenId === chat.id && (
                    <div className={styles.menu}>
                      <button onClick={() => handleStartEdit(chat)}>
                        <Edit2 size={14} />
                        <span>Переименовать</span>
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(chat.id)}>
                        <Trash2 size={14} />
                        <span>Удалить</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
