"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSuperAdmin } from "@/lib/ai-studio/access-client";
import { Sparkles, Lock, ArrowLeft } from "lucide-react";
import AIStudioSidebar from "./components/Sidebar";
import styles from "./layout.module.css";

interface UserRole {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  allowed_modes: string[];
}

interface AIStudioLayoutProps {
  children: React.ReactNode;
}

export default function AIStudioLayout({ children }: AIStudioLayoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    async function checkAccess() {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        setUserEmail(user.email || null);

        // Проверяем супер-админа
        if (isSuperAdmin(user.email)) {
          setHasAccess(true);
          setIsAdmin(true);
          setUserRole({
            id: 'super_admin',
            name: 'Супер-админ',
            color: '#ef4444',
            permissions: ['*'],
            allowed_modes: ['*'],
          });
          setIsLoading(false);
          return;
        }

        // Проверяем доступ организации через API
        const res = await fetch("/api/ai-studio/access/check");
        if (res.ok) {
          const data = await res.json();
          setHasAccess(data.hasAccess);
          setIsAdmin(data.isAdmin || false);
          setUserRole(data.userRole || null);
        } else {
          setHasAccess(false);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <p>Загрузка ИИ Студии...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={styles.accessDenied}>
        <Lock className="h-16 w-16 text-red-500 mb-4" />
        <h1>Доступ запрещён</h1>
        <p>У вас нет доступа к ИИ Студии.</p>
        <p className={styles.hint}>
          Обратитесь к администратору для получения доступа.
        </p>
        <button
          className={styles.backButton}
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться на главную
        </button>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <AIStudioSidebar userEmail={userEmail} isAdmin={isAdmin} userRole={userRole} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
