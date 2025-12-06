"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type UserData = {
  email: string;
  fullName: string;
  avatar: string | null;
};

type UserProfileDropdownProps = {
  userData: UserData;
};

export default function UserProfileDropdown({ userData }: UserProfileDropdownProps) {
  const router = useRouter();

  const getInitials = (name: string, email: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name[0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const handleSignOut = async () => {
    if (!confirm("Вы уверены что хотите выйти?")) return;
    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (res.ok) router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      alert("Ошибка при выходе");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 p-2 h-auto">
          {userData.avatar ? (
            <Image src={userData.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover" width={40} height={40} unoptimized={userData.avatar.startsWith('data:')} />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">{getInitials(userData.fullName, userData.email)}</div>
          )}
          <div className="hidden md:block text-left">
            <div className="text-sm font-medium">{userData.fullName || userData.email}</div>
            <div className="text-xs text-muted-foreground">{userData.email}</div>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2"><User className="h-4 w-4" />Мой профиль</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2"><Settings className="h-4 w-4" />Настройки</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />Выйти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
