"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Star, 
  Plus, 
  ArrowRight,
  Scale,
  PenTool,
  TrendingUp,
  Globe,
  BarChart3,
  Code,
  Briefcase,
  GraduationCap,
  Heart,
  Lightbulb,
  MessageSquare,
  FileText
} from "lucide-react";
import styles from "./page.module.css";

interface Assistant {
  id: string;
  name: string;
  description: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  model: string;
  isPublic: boolean;
  isFavorite?: boolean;
}

const defaultAssistants: Assistant[] = [
  {
    id: "lawyer",
    name: "Юрист",
    description: "Консультации по правовым вопросам, анализ документов",
    emoji: "⚖️",
    icon: Scale,
    color: "#6366f1",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "copywriter",
    name: "Копирайтер",
    description: "Написание текстов, SEO-оптимизация, рерайт",
    emoji: "✍️",
    icon: PenTool,
    color: "#f59e0b",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "marketer",
    name: "Маркетолог",
    description: "Маркетинговые стратегии, анализ рынка, идеи",
    emoji: "📈",
    icon: TrendingUp,
    color: "#10b981",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "translator",
    name: "Переводчик",
    description: "Перевод текстов на 50+ языков с контекстом",
    emoji: "🌍",
    icon: Globe,
    color: "#3b82f6",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "analyst",
    name: "Аналитик",
    description: "Анализ данных, отчёты, визуализация",
    emoji: "📊",
    icon: BarChart3,
    color: "#8b5cf6",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "programmer",
    name: "Программист",
    description: "Код, отладка, архитектура, code review",
    emoji: "💻",
    icon: Code,
    color: "#ec4899",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "hr",
    name: "HR-менеджер",
    description: "Подбор персонала, интервью, оценка кандидатов",
    emoji: "👔",
    icon: Briefcase,
    color: "#14b8a6",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "teacher",
    name: "Преподаватель",
    description: "Объяснение тем, создание учебных материалов",
    emoji: "🎓",
    icon: GraduationCap,
    color: "#f97316",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "psychologist",
    name: "Психолог",
    description: "Поддержка, советы, техники саморегуляции",
    emoji: "🧠",
    icon: Heart,
    color: "#ef4444",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "ideator",
    name: "Генератор идей",
    description: "Брейншторминг, креативные решения",
    emoji: "💡",
    icon: Lightbulb,
    color: "#eab308",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "interviewer",
    name: "Интервьюер",
    description: "Подготовка к собеседованиям, mock-интервью",
    emoji: "🎤",
    icon: MessageSquare,
    color: "#06b6d4",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
  {
    id: "summarizer",
    name: "Саммаризатор",
    description: "Краткие выжимки из текстов и документов",
    emoji: "📝",
    icon: FileText,
    color: "#84cc16",
    model: "Gemini 3 Pro",
    isPublic: true,
  },
];

export default function AssistantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  const filteredAssistants = defaultAssistants.filter((assistant) => {
    const matchesSearch = 
      assistant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assistant.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFavorites = !showFavoritesOnly || favorites.has(assistant.id);
    
    return matchesSearch && matchesFavorites;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ассистенты GPTs</h1>
          <p className={styles.subtitle}>
            Выберите готового ассистента или создайте своего
          </p>
        </div>
        <Link href="/ai-studio/assistants/new" className={styles.createButton}>
          <Plus className="h-5 w-5" />
          <span>Создать ассистента</span>
        </Link>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Найти ассистента..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button
          className={`${styles.favoriteFilter} ${showFavoritesOnly ? styles.active : ""}`}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Star className="h-4 w-4" />
          <span>Избранное</span>
        </button>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {filteredAssistants.map((assistant) => {
          const isFavorite = favorites.has(assistant.id);
          
          return (
            <div
              key={assistant.id}
              className={styles.card}
              style={{ "--assistant-color": assistant.color } as React.CSSProperties}
            >
              <div className={styles.cardHeader}>
                <div 
                  className={styles.cardAvatar}
                  style={{ background: assistant.color }}
                >
                  <span className={styles.cardEmoji}>{assistant.emoji}</span>
                </div>
                <button
                  className={`${styles.favoriteBtn} ${isFavorite ? styles.active : ""}`}
                  onClick={() => toggleFavorite(assistant.id)}
                >
                  <Star className="h-4 w-4" />
                </button>
              </div>
              
              <h3 className={styles.cardName}>{assistant.name}</h3>
              <p className={styles.cardDescription}>{assistant.description}</p>
              <p className={styles.cardModel}>{assistant.model}</p>
              
              <Link 
                href={`/ai-studio/assistants/${assistant.id}`}
                className={styles.cardButton}
              >
                <span>Начать чат</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAssistants.length === 0 && (
        <div className={styles.emptyState}>
          <Search className={styles.emptyIcon} />
          <h3>Ничего не найдено</h3>
          <p>Попробуйте изменить поисковый запрос</p>
        </div>
      )}
    </div>
  );
}
