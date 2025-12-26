"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ModeSwitcher from "./ModeSwitcher";
import { TendersModuleSwitcher } from "./TendersModuleSwitcher";
import UserMenu from "./UserMenu";
import NotificationCenter from "./NotificationCenter";
import OrganizationSwitcher from "./OrganizationSwitcher";
import { stopImpersonating } from "@/lib/admin/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Settings, Calendar, Search, LogOut, Landmark, User, Receipt, MessageSquare } from "lucide-react";

interface PlatformHeaderProps {
  user?: {
    email?: string;
    full_name?: string;
    avatar_url?: string;
    phone?: string;
    created_at?: string;
  };
  organization?: {
    name: string;
    allowed_modes?: string[];
  };
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    subscription_plan: string;
  }>;
  globalEnabledModes?: string[];
  userAllowedModes?: string[];
  notificationCount?: number;
  impersonating?: {
    userId: string;
    userName: string;
  } | null;
  isSuperAdmin?: boolean;
  isOrgAdmin?: boolean;
  roleName?: string;
  roleColor?: string;
  rolePermissions?: string[];
  roleAllowedModes?: string[];
  departmentName?: string;
  position?: string;
}

export default function PlatformHeader({
  user,
  organization,
  organizations = [],
  globalEnabledModes,
  userAllowedModes,
  notificationCount = 0,
  impersonating,
  isSuperAdmin = false,
  isOrgAdmin = false,
  roleName,
  roleColor,
  rolePermissions,
  roleAllowedModes,
  departmentName,
  position,
}: PlatformHeaderProps) {
  const router = useRouter();

  const handleStopImpersonating = async () => {
    try {
      await stopImpersonating();
      router.refresh();
    } catch (error) {
      console.error('Error stopping impersonation:', error);
    }
  };

  return (
    <>
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
          <User className="h-5 w-5" />
          <span>Вы работаете под пользователем: <strong>{impersonating.userName}</strong></span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleStopImpersonating}
            className="text-white hover:bg-amber-600 ml-2"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Выйти
          </Button>
        </div>
      )}
      <header className={`bg-white dark:bg-zinc-900 border-b shadow-sm fixed left-0 right-0 z-40 ${impersonating ? 'top-10' : 'top-0'}`}>
        <div className="max-w-[1800px] mx-auto px-4 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 text-blue-600 font-bold text-lg hover:text-blue-700 transition-colors">
            <Landmark className="h-6 w-6" />
            <span className="hidden sm:inline">FinApp</span>
          </Link>

          {/* Mode Switcher */}
          <ModeSwitcher 
            allowedModes={organization?.allowed_modes} 
            globalEnabledModes={globalEnabledModes}
            userAllowedModes={userAllowedModes}
          />

          {/* Tenders Module Switcher - показывается только в режиме Тендеры */}
          <TendersModuleSwitcher />

          {/* Greeting - Hidden on mobile */}
          <div className="hidden lg:block text-sm text-gray-600">
            Привет, <span className="font-medium">{user?.full_name || 'Пользователь'}</span>!
          </div>

          {/* Search */}
          <div className="hidden md:flex items-center relative flex-1 max-w-md">
            <Search className="absolute left-3 h-4 w-4 text-gray-400" />
            <Input 
              type="search" 
              placeholder="Поиск..." 
              className="pl-9 h-9"
            />
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* Quick Super Admin Access Button - Только для супер-админов */}
            {isSuperAdmin && (
              <Button asChild variant="default" size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Link href="/superadmin" title="Супер-админ">
                  <Shield className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Админ</span>
                </Link>
              </Button>
            )}

            {/* Organization Admin Button - Для админов организации (не супер-админов) */}
            {isOrgAdmin && !isSuperAdmin && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/settings" title="Управление организацией">
                  <Settings className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Управление</span>
                </Link>
              </Button>
            )}

            {/* Receipts Button */}
            <Button asChild variant="outline" size="sm" className="hidden md:flex bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 hover:from-emerald-100 hover:to-teal-100 text-emerald-700">
              <Link href="/finance/receipts" title="Чеки">
                <Receipt className="h-4 w-4 mr-1.5" />
                <span className="hidden lg:inline">Чеки</span>
              </Link>
            </Button>

            {/* AI Chat Button */}
            <Button asChild variant="outline" size="sm" className="hidden md:flex bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 hover:from-violet-100 hover:to-purple-100 text-violet-700">
              <Link href="/finance/ai-chat" title="AI Чат">
                <MessageSquare className="h-4 w-4 mr-1.5" />
                <span className="hidden lg:inline">AI Чат</span>
              </Link>
            </Button>

            {/* Calendar - Hidden on mobile */}
            <Button variant="ghost" size="icon" className="hidden md:flex" aria-label="Календарь">
              <Calendar className="h-5 w-5" />
            </Button>

            {/* Organization Switcher */}
            {organization && organizations.length > 0 && (
              <OrganizationSwitcher
                currentOrganization={{
                  id: organization.name,
                  name: organization.name,
                  slug: organization.name,
                  subscription_plan: 'free'
                }}
                organizations={organizations}
              />
            )}

            {/* Notifications - Hidden on mobile */}
            <div className="hidden md:block">
              <NotificationCenter
                unreadCount={notificationCount}
              />
            </div>

            {/* User Menu */}
            {user && (
              <UserMenu
                user={{
                  email: user.email || '',
                  full_name: user.full_name || '',
                  avatar_url: user.avatar_url || '',
                  phone: user.phone || '',
                  created_at: user.created_at || '',
                }}
                isAdmin={isSuperAdmin || isOrgAdmin}
                isSuperAdmin={isSuperAdmin}
                roleName={roleName}
                roleColor={roleColor}
                rolePermissions={rolePermissions}
                roleAllowedModes={roleAllowedModes}
                organizationName={organization?.name}
                departmentName={departmentName}
                position={position}
              />
            )}
          </div>
        </div>
      </header>
    </>
  );
}
