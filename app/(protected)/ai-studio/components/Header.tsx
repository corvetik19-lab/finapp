"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { isSuperAdmin } from "@/lib/ai-studio/access-client";
import { Sparkles, MessageCircle, Image, Video, Mic, FileText, FlaskConical, BadgeCheck, User, ChevronDown, ChevronUp, LayoutDashboard, Settings } from "lucide-react";
import styles from "./Header.module.css";

interface HeaderProps {
  userEmail: string | null;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: MessageCircle,
  image: Image,
  video: Video,
  audio: Mic,
  document: FileText,
  research: FlaskConical,
};

const modes = [
  { id: "chat", label: "Чат", icon: "chat", path: "/ai-studio/chat" },
  { id: "image", label: "Изображения", icon: "image", path: "/ai-studio/image" },
  { id: "video", label: "Видео", icon: "video", path: "/ai-studio/video" },
  { id: "audio", label: "Аудио", icon: "audio", path: "/ai-studio/audio" },
  { id: "document", label: "Документы", icon: "document", path: "/ai-studio/document" },
  { id: "research", label: "Исследования", icon: "research", path: "/ai-studio/research" },
];

export default function AIStudioHeader({ userEmail }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const superAdmin = isSuperAdmin(userEmail);

  const currentMode = modes.find(m => pathname?.startsWith(m.path))?.id || "chat";

  const renderIcon = (iconKey: string) => {
    const IconComponent = ICONS[iconKey];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/ai-studio" className={styles.title}>
          <Sparkles className="h-5 w-5 text-violet-500" />
          ИИ Студия
        </Link>
      </div>

      {/* Mode Switcher */}
      <nav className={styles.modeNav}>
        {modes.map((mode) => (
          <Link
            key={mode.id}
            href={mode.path}
            className={`${styles.modeLink} ${currentMode === mode.id ? styles.active : ""}`}
          >
            {renderIcon(mode.icon)}
            <span className={styles.modeLabel}>{mode.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.right}>
        {superAdmin && (
          <div className={styles.badge}>
            <BadgeCheck className="h-4 w-4" />
            Супер-админ
          </div>
        )}

        <div className={styles.userMenu}>
          <button
            className={styles.userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className={styles.avatar}>
              <User className="h-4 w-4 text-white" />
            </div>
            <span className={styles.email}>{userEmail}</span>
            {showUserMenu ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showUserMenu && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownItem}>
                <User className="h-4 w-4" />
                <span>{userEmail}</span>
              </div>
              <div className={styles.divider} />
              <a href="/dashboard" className={styles.dropdownItem}>
                <LayoutDashboard className="h-4 w-4" />
                <span>Главная</span>
              </a>
              <a href="/settings" className={styles.dropdownItem}>
                <Settings className="h-4 w-4" />
                <span>Настройки</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
