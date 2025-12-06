"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogOut, Pencil, Lock, Camera } from "lucide-react";

type ProfileData = {
  email: string;
  fullName: string;
  phone: string;
  avatar: string | null;
  createdAt: string;
};

type ProfileManagerProps = {
  profile: ProfileData;
};

export default function ProfileManager({ profile: initialProfile }: ProfileManagerProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: initialProfile.fullName || "",
    phone: initialProfile.phone || "",
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = async () => {
    if (!confirm("Вы уверены что хотите выйти?")) return;

    try {
      const res = await fetch("/api/auth/signout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } catch (error) {
      console.error("Sign out error:", error);
      alert("Ошибка при выходе");
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      setProfile({ ...profile, ...editForm });
      setIsEditing(false);
      alert("Профиль обновлён!");
      router.refresh();
    } catch (error) {
      console.error("Update error:", error);
      alert("Ошибка при обновлении профиля");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Пароли не совпадают");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change password");
      }

      alert("Пароль успешно изменён!");
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Password change error:", error);
      alert(error instanceof Error ? error.message : "Ошибка при смене пароля");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум 2MB");
      return;
    }

    // Проверка типа
    if (!file.type.startsWith("image/")) {
      alert("Можно загружать только изображения");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setIsSaving(true);
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
      setIsSaving(false);
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
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Мой профиль</h1><Button variant="outline" onClick={handleSignOut}><LogOut className="h-4 w-4 mr-2" />Выйти</Button></div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              {profile.avatar ? <Image src={profile.avatar} alt="Avatar" className="w-28 h-28 rounded-full object-cover" width={112} height={112} unoptimized={profile.avatar.startsWith('data:')} /> : <div className="w-28 h-28 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">{getInitials(profile.fullName || profile.email)}</div>}
              <Button size="icon" variant="secondary" className="absolute bottom-0 right-0 rounded-full h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isSaving}><Camera className="h-4 w-4" /></Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div><h2 className="text-xl font-semibold">{profile.fullName || "Не указано"}</h2><p className="text-muted-foreground">{profile.email}</p><p className="text-sm text-muted-foreground">На платформе с {formatDate(profile.createdAt)}</p></div>
          </div>
          {!isEditing ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label className="text-muted-foreground">Полное имя</Label><p className="font-medium">{profile.fullName || "—"}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{profile.email}</p></div>
                <div><Label className="text-muted-foreground">Телефон</Label><p className="font-medium">{profile.phone || "—"}</p></div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => { setEditForm({ fullName: profile.fullName || "", phone: profile.phone || "" }); setIsEditing(true); }}><Pencil className="h-4 w-4 mr-2" />Редактировать</Button>
                <Button variant="outline" onClick={() => setShowPasswordModal(true)}><Lock className="h-4 w-4 mr-2" />Сменить пароль</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Полное имя</Label><Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} placeholder="Введите ваше имя" /></div>
              <div className="space-y-2"><Label>Телефон</Label><Input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+7 (999) 123-45-67" /></div>
              <div className="flex gap-2"><Button onClick={handleSaveProfile} disabled={isSaving}>{isSaving ? "Сохранение..." : "Сохранить"}</Button><Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Отмена</Button></div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent><DialogHeader><DialogTitle>Смена пароля</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Текущий пароль</Label><Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} placeholder="Введите текущий пароль" /></div>
            <div className="space-y-2"><Label>Новый пароль</Label><Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Минимум 6 символов" /></div>
            <div className="space-y-2"><Label>Подтвердите пароль</Label><Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="Повторите новый пароль" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowPasswordModal(false)} disabled={isSaving}>Отмена</Button><Button onClick={handleChangePassword} disabled={isSaving}>{isSaving ? "Изменение..." : "Изменить"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
