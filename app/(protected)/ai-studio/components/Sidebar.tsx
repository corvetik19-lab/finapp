"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sparkles, 
  MessageCircle, 
  Video, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  Wand2,
  Users,
  ImagePlus,
  Volume2,
  Eraser,
  Sparkle,
  Home,
  Palette,
  Clapperboard,
  Music,
  History,
  Film,
  Disc3,
  Layers
} from "lucide-react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  userEmail: string | null;
}

const menuSections = [
  {
    id: "home",
    label: "Главная",
    icon: Home,
    href: "/ai-studio",
    items: [],
  },
  {
    id: "chat",
    label: "Gemini Чат",
    icon: MessageCircle,
    href: "/ai-studio/chat",
    items: [],
  },
  {
    id: "assistants",
    label: "Ассистенты GPTs",
    icon: Users,
    href: "/ai-studio/assistants",
    items: [],
  },
  {
    id: "kie",
    label: "Kie.ai Market",
    icon: Palette,
    items: [
      { id: "kie-all", href: "/ai-studio/kie", icon: Sparkles, label: "Все модели" },
      { id: "kie-images", href: "/ai-studio/kie/images", icon: ImagePlus, label: "Изображения" },
      { id: "kie-video", href: "/ai-studio/kie/video", icon: Clapperboard, label: "Видео" },
      { id: "kie-audio", href: "/ai-studio/kie/audio", icon: Music, label: "Аудио (TTS)" },
      { id: "kie-history", href: "/ai-studio/kie/history", icon: History, label: "История" },
    ],
  },
  {
    id: "tools",
    label: "Инструменты AI",
    icon: Wand2,
    items: [
      { id: "live-photos", href: "/ai-studio/tools/live-photos", icon: Video, label: "Оживление фото" },
      { id: "tts", href: "/ai-studio/tools/tts", icon: Volume2, label: "Речь/Аудио" },
      { id: "music", href: "/ai-studio/tools/music", icon: Disc3, label: "Музыка (Suno)" },
      { id: "video-gen", href: "/ai-studio/tools/video-gen", icon: Film, label: "Видео генератор" },
      { id: "flux-kontext", href: "/ai-studio/tools/flux-kontext", icon: Layers, label: "Flux Kontext" },
      { id: "stickers", href: "/ai-studio/tools/stickers", icon: ImagePlus, label: "Стикеры" },
      { id: "bg-remover", href: "/ai-studio/tools/bg-remover", icon: Eraser, label: "Удаление фона" },
      { id: "transcribe", href: "/ai-studio/tools/transcribe", icon: FileText, label: "Транскрибация" },
      { id: "enhance", href: "/ai-studio/tools/enhance", icon: Sparkle, label: "Фотобустер" },
    ],
  },
];

export default function AIStudioSidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["tools"]));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <Link href="/ai-studio" className={styles.logo}>
        <div className={styles.logoIcon}>
          <Sparkles className={styles.logoSvg} />
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoTitle}>Gemini</span>
          <span className={styles.logoSubtitle}>AI Studio</span>
        </div>
      </Link>

      {/* Navigation Sections */}
      <nav className={styles.nav}>
        {menuSections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = expandedSections.has(section.id);
          
          // Если секция имеет прямую ссылку (как Ассистенты)
          if (section.href) {
            const isActive = pathname === section.href || pathname.startsWith(section.href + "/");
            return (
              <div key={section.id} className={styles.section}>
                <Link
                  href={section.href}
                  className={`${styles.sectionHeader} ${styles.sectionLink} ${isActive ? styles.active : ""}`}
                >
                  <SectionIcon size={16} />
                  <span>{section.label}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            );
          }

          return (
            <div key={section.id} className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection(section.id)}
              >
                <SectionIcon size={16} />
                <span>{section.label}</span>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              {isExpanded && (
                <div className={styles.sectionItems}>
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                      >
                        <ItemIcon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
