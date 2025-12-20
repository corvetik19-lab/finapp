"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Users, 
  Video, 
  Volume2, 
  ImagePlus, 
  Eraser, 
  FileText, 
  Sparkle,
  ArrowRight,
  Zap,
  MessageCircle,
  Palette,
  Brain,
  TrendingUp,
  Clock
} from "lucide-react";
import styles from "./page.module.css";

interface UserAccessInfo {
  isAdmin: boolean;
  userRole: {
    permissions: string[];
  } | null;
}

// Проверка наличия permission
const hasPermission = (permissions: string[] | undefined, required: string[]): boolean => {
  if (!permissions || permissions.length === 0) return false;
  if (permissions.includes('*')) return true;
  return required.some(req => permissions.includes(req));
};

const tools = [
  {
    id: "live-photos",
    href: "/ai-studio/tools/live-photos",
    icon: Video,
    title: "Оживление фото",
    model: "Kling / Hailuo",
    description: "Превратите фото в видео",
    color: "#ef4444",
  },
  {
    id: "tts",
    href: "/ai-studio/tools/tts",
    icon: Volume2,
    title: "Речь/Аудио",
    model: "ElevenLabs",
    description: "Озвучка с выбором голоса",
    color: "#10b981",
  },
  {
    id: "stickers",
    href: "/ai-studio/tools/stickers",
    icon: ImagePlus,
    title: "Стикеры",
    model: "Imagen4 / Flux",
    description: "Генерация стикеров",
    color: "#f59e0b",
  },
  {
    id: "bg-remover",
    href: "/ai-studio/tools/bg-remover",
    icon: Eraser,
    title: "Удаление фона",
    model: "BRIA / BiRefNet",
    description: "Удаление фона с фото",
    color: "#8b5cf6",
  },
  {
    id: "transcribe",
    href: "/ai-studio/tools/transcribe",
    icon: FileText,
    title: "Транскрибация",
    model: "Gemini Flash",
    description: "Аудио и видео в текст",
    color: "#3b82f6",
  },
  {
    id: "enhance",
    href: "/ai-studio/tools/enhance",
    icon: Sparkle,
    title: "Фотобустер",
    model: "Aura SR",
    description: "Улучшение качества",
    color: "#ec4899",
  },
];

interface RecentChat {
  id: string;
  title: string;
  date: string;
}

export default function AIStudioHomePage() {
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [accessInfo, setAccessInfo] = useState<UserAccessInfo | null>(null);

  useEffect(() => {
    // Загружаем права доступа пользователя
    const loadAccessInfo = async () => {
      try {
        const response = await fetch("/api/ai-studio/access/check");
        if (response.ok) {
          const data = await response.json();
          setAccessInfo({
            isAdmin: data.isAdmin || false,
            userRole: data.userRole || null,
          });
        }
      } catch (error) {
        console.error("Failed to load access info:", error);
      }
    };
    loadAccessInfo();

    const loadRecentChats = async () => {
      try {
        const response = await fetch("/api/ai-studio/chats");
        if (response.ok) {
          const chats = await response.json();
          setRecentChats(
            chats.slice(0, 3).map((chat: { id: string; title: string | null; updated_at: string }) => ({
              id: chat.id,
              title: chat.title || "Новый чат",
              date: new Date(chat.updated_at).toLocaleDateString("ru-RU"),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load chats:", error);
      }
    };
    loadRecentChats();
  }, []);

  // Проверяем доступ к функциям
  const canAccessKie = accessInfo?.isAdmin || hasPermission(accessInfo?.userRole?.permissions, ['ai-studio:kie', 'ai-studio:media', 'ai-studio:*', '*']);
  const canAccessAssistants = accessInfo?.isAdmin || hasPermission(accessInfo?.userRole?.permissions, ['ai-studio:assistants', 'ai-studio:*', '*']);
  const canAccessTools = accessInfo?.isAdmin || hasPermission(accessInfo?.userRole?.permissions, ['ai-studio:tools', 'ai-studio:*', '*']);

  return (
    <div className={styles.container}>
      {/* Hero Cards */}
      <div className={styles.heroCards}>
        {/* Gemini Chat Card */}
        <Link href="/ai-studio/chat" className={styles.heroCard}>
          <div className={styles.heroCardIcon} style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <MessageCircle size={24} />
          </div>
          <div className={styles.heroCardContent}>
            <h2>Gemini Чат</h2>
            <p>Gemini 3 Flash — новейшая модель с thinking</p>
            <div className={styles.heroCardFeatures}>
              <span><Brain size={12} /> Deep Thinking</span>
              <span><TrendingUp size={12} /> 1M токенов</span>
            </div>
          </div>
          <ArrowRight className={styles.heroCardArrow} />
        </Link>

        {/* Kie.ai Card - только для админов и пользователей с правами */}
        {canAccessKie && (
          <Link href="/ai-studio/kie" className={styles.heroCard}>
            <div className={styles.heroCardIcon} style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}>
              <Palette size={24} />
            </div>
            <div className={styles.heroCardContent}>
              <h2>Kie.ai Market</h2>
              <p>100+ моделей для изображений, видео и аудио</p>
              <div className={styles.heroCardFeatures}>
                <span><ImagePlus size={12} /> Imagen4</span>
                <span><Video size={12} /> Kling</span>
                <span><Volume2 size={12} /> ElevenLabs</span>
              </div>
            </div>
            <ArrowRight className={styles.heroCardArrow} />
          </Link>
        )}

        {/* Assistants Card - только для админов и пользователей с правами */}
        {canAccessAssistants && (
          <Link href="/ai-studio/assistants" className={styles.heroCard}>
            <div className={styles.heroCardIcon} style={{ background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}>
              <Users size={24} />
            </div>
            <div className={styles.heroCardContent}>
              <h2>Ассистенты GPTs</h2>
              <p>Создайте своего ИИ-помощника</p>
              <div className={styles.heroCardFeatures}>
                <span>⚖️ Юрист</span>
                <span>✍️ Копирайтер</span>
                <span>📊 Аналитик</span>
              </div>
            </div>
            <ArrowRight className={styles.heroCardArrow} />
          </Link>
        )}
      </div>

      {/* Recent Chats */}
      {recentChats.length > 0 && (
        <div className={styles.recentSection}>
          <div className={styles.sectionHeader}>
            <Clock size={18} />
            <h2>Недавние чаты</h2>
            <Link href="/ai-studio/chat" className={styles.seeAllLink}>
              Все чаты →
            </Link>
          </div>
          <div className={styles.recentChats}>
            {recentChats.map((chat) => (
              <Link key={chat.id} href={`/ai-studio/chat/${chat.id}`} className={styles.recentChat}>
                <MessageCircle size={16} />
                <span className={styles.recentChatTitle}>{chat.title}</span>
                <span className={styles.recentChatDate}>{chat.date}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tools Section - только для админов и пользователей с правами */}
      {canAccessTools && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Zap size={18} />
            <h2>Инструменты AI</h2>
          </div>
          
          <div className={styles.toolsGrid}>
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className={styles.toolCard}
                  style={{ "--tool-color": tool.color } as React.CSSProperties}
                >
                  <div className={styles.toolIcon}>
                    <Icon size={20} />
                  </div>
                  <div className={styles.toolContent}>
                    <h3>{tool.title}</h3>
                    <p className={styles.toolModel}>{tool.model}</p>
                    <p className={styles.toolDescription}>{tool.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Footer - показываем только админам */}
      {accessInfo?.isAdmin && (
        <div className={styles.infoFooter}>
          <Sparkles size={16} />
          <span>
            <strong>Gemini 3 Flash</strong> для чата • <strong>Kie.ai</strong> для генерации медиа • 
            <strong> GPTs</strong> для кастомных ассистентов
          </span>
        </div>
      )}
    </div>
  );
}
