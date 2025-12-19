"use client";

import Link from "next/link";
import { 
  Video, 
  Volume2, 
  ImagePlus, 
  Eraser, 
  FileText, 
  Sparkle,
  ArrowRight,
  Wand2
} from "lucide-react";
import styles from "./page.module.css";

const tools = [
  {
    id: "live-photos",
    href: "/ai-studio/tools/live-photos",
    icon: Video,
    title: "Оживление фото",
    model: "Veo 3.1",
    description: "Превратите статичное фото в видео с движением. Загрузите изображение и опишите желаемое движение.",
    features: ["Текст → Видео", "Фото → Видео", "720p/1080p", "Нативный звук"],
    color: "#ef4444",
  },
  {
    id: "tts",
    href: "/ai-studio/tools/tts",
    icon: Volume2,
    title: "Речь/Аудио (TTS)",
    model: "Gemini TTS",
    description: "Озвучка текста с выбором голоса. 7 разных голосов и поддержка 10+ языков.",
    features: ["7 голосов", "10+ языков", "Высокое качество", "Скачивание MP3"],
    color: "#10b981",
  },
  {
    id: "stickers",
    href: "/ai-studio/tools/stickers",
    icon: ImagePlus,
    title: "Стикеры",
    model: "Gemini Image",
    description: "Генерация стикеров и иллюстраций по текстовому описанию с прозрачным фоном.",
    features: ["Генерация", "Прозрачный фон", "PNG", "Любой стиль"],
    color: "#f59e0b",
  },
  {
    id: "bg-remover",
    href: "/ai-studio/tools/bg-remover",
    icon: Eraser,
    title: "Удаление фона",
    model: "Gemini Image",
    description: "Автоматическое удаление фона с изображений. Идеально для товаров и портретов.",
    features: ["Авто-удаление", "PNG с прозрачностью", "Товары", "Портреты"],
    color: "#8b5cf6",
  },
  {
    id: "transcribe",
    href: "/ai-studio/tools/transcribe",
    icon: FileText,
    title: "Транскрибация",
    model: "Gemini Flash",
    description: "Преобразование аудио и видео в текст с таймкодами. Поддержка множества языков.",
    features: ["Аудио → Текст", "Видео → Текст", "Таймкоды", "Мультиязычность"],
    color: "#3b82f6",
  },
  {
    id: "enhance",
    href: "/ai-studio/tools/enhance",
    icon: Sparkle,
    title: "Фотобустер",
    model: "Gemini Image",
    description: "Улучшение качества фотографий: увеличение разрешения, коррекция цвета, шумоподавление.",
    features: ["Upscale", "Цветокоррекция", "Шумоподавление", "HDR"],
    color: "#ec4899",
  },
];

export default function ToolsPage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Wand2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className={styles.title}>Инструменты AI</h1>
          <p className={styles.subtitle}>
            Набор утилит для работы с изображениями, видео и аудио
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className={styles.card}
              style={{ "--tool-color": tool.color } as React.CSSProperties}
            >
              <div className={styles.cardIcon}>
                <Icon className="h-6 w-6" />
              </div>
              
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{tool.title}</h3>
                <p className={styles.cardModel}>{tool.model}</p>
                <p className={styles.cardDescription}>{tool.description}</p>
                
                <div className={styles.cardFeatures}>
                  {tool.features.map((feature, i) => (
                    <span key={i} className={styles.featureTag}>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className={styles.cardArrow}>
                <ArrowRight className="h-5 w-5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
