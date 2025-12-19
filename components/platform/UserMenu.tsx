"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Building2, HelpCircle, LogOut, ChevronDown } from "lucide-react";
import EmployeeProfileModal, { EmployeeProfileData } from "@/components/profile/EmployeeProfileModal";

interface UserMenuProps {
  user: {
    email?: string;
    full_name?: string;
    avatar_url?: string;
    phone?: string;
    created_at?: string;
  };
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  roleName?: string;
  departmentName?: string;
  position?: string;
}

export default function UserMenu({ 
  user, 
  isAdmin = false, 
  isSuperAdmin = false,
  roleName,
  departmentName,
  position 
}: UserMenuProps) {
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const userInitial = user.full_name?.[0] || user.email?.[0] || "U";

  const handleSignOut = async () => {
    const response = await fetch("/auth/signout", { method: "POST" });
    if (response.ok) {
      router.push("/login");
      router.refresh();
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    if (!isAdmin) {
      e.preventDefault();
      setShowProfileModal(true);
    }
  };

  const profileData: EmployeeProfileData = {
    email: user.email || "",
    fullName: user.full_name || "",
    phone: user.phone || "",
    avatar: user.avatar_url || null,
    createdAt: user.created_at || "",
    roleName,
    departmentName,
    position,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
          <Avatar className="h-8 w-8">
            {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name || "User"} />}
            <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
              {userInitial.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {user.full_name && (
            <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">
              {user.full_name}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* Header with user info */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-2">
            <Avatar className="h-12 w-12">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name || "User"} />}
              <AvatarFallback className="bg-blue-600 text-white text-lg font-medium">
                {userInitial.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.full_name || "Пользователь"}
              </p>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Profile - для сотрудников открывает модалку */}
        <DropdownMenuItem asChild>
          {isAdmin ? (
            <Link href="/settings/profile" className="flex items-center gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              <span>Профиль</span>
            </Link>
          ) : (
            <button 
              onClick={handleProfileClick} 
              className="flex items-center gap-2 cursor-pointer w-full"
            >
              <User className="h-4 w-4" />
              <span>Профиль</span>
            </button>
          )}
        </DropdownMenuItem>

        {/* Admin - Организация */}
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/settings/organization" className="flex items-center gap-2 cursor-pointer">
              <Building2 className="h-4 w-4" />
              <span>Организация</span>
            </Link>
          </DropdownMenuItem>
        )}

        {/* Help - для всех */}
        <DropdownMenuItem asChild>
          <Link href="/help" className="flex items-center gap-2 cursor-pointer">
            <HelpCircle className="h-4 w-4" />
            <span>Помощь</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign out */}
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Employee Profile Modal */}
      {!isAdmin && (
        <EmployeeProfileModal
          open={showProfileModal}
          onOpenChange={setShowProfileModal}
          profile={profileData}
        />
      )}
    </DropdownMenu>
  );
}
