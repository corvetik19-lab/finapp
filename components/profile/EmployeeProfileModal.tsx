"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Mail, Phone, Calendar, Shield, Building2, Briefcase } from "lucide-react";

export interface EmployeeProfileData {
  email: string;
  fullName: string;
  phone: string;
  avatar: string | null;
  createdAt: string;
  roleName?: string;
  departmentName?: string;
  position?: string;
}

interface EmployeeProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: EmployeeProfileData;
}

export default function EmployeeProfileModal({
  open,
  onOpenChange,
  profile: initialProfile,
}: EmployeeProfileModalProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Можно загружать только изображения");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setIsUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload avatar");

      const data = await res.json();
      setProfile({ ...profile, avatar: data.avatarUrl });
      router.refresh();
    } catch (error) {
      console.error("Avatar upload error:", error);
      alert("Ошибка при загрузке аватара");
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Мой профиль</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {/* Avatar */}
          <div className="relative mb-4">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                width={96}
                height={96}
                unoptimized={profile.avatar.startsWith("data:")}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold border-4 border-white shadow-lg">
                {getInitials(profile.fullName || profile.email)}
              </div>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Camera className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Name */}
          <h2 className="text-xl font-semibold text-center">
            {profile.fullName || "Не указано"}
          </h2>
          
          {/* Role Badge */}
          {profile.roleName && (
            <div className="mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {profile.roleName}
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
          </div>

          {profile.phone && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-xs text-muted-foreground">Телефон</Label>
                <p className="text-sm font-medium">{profile.phone}</p>
              </div>
            </div>
          )}

          {profile.position && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-xs text-muted-foreground">Должность</Label>
                <p className="text-sm font-medium">{profile.position}</p>
              </div>
            </div>
          )}

          {profile.departmentName && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-xs text-muted-foreground">Отдел</Label>
                <p className="text-sm font-medium">{profile.departmentName}</p>
              </div>
            </div>
          )}

          {profile.roleName && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-xs text-muted-foreground">Роль в системе</Label>
                <p className="text-sm font-medium">{profile.roleName}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="text-xs text-muted-foreground">На платформе с</Label>
              <p className="text-sm font-medium">{formatDate(profile.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 text-center text-xs text-muted-foreground">
          Для изменения данных профиля обратитесь к администратору
        </div>
      </DialogContent>
    </Dialog>
  );
}
