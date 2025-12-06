"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Pencil, Trash2, ShieldCheck, Lock, Users, Eye, EyeOff, Award, Loader2 } from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";

export type UserRecord = {
  id: string;
  email: string;
  full_name: string | null;
  role_id: string | null;
  role_name: string | null;
  role_color: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin?: boolean;
};

export type RoleOption = {
  id: string;
  name: string;
  color: string;
};

type UsersManagerProps = {
  users: UserRecord[];
  roles: RoleOption[];
};

export default function UsersManager({ users: initialUsers, roles }: UsersManagerProps) {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[]>(initialUsers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role_id: "",
  });

  const [editForm, setEditForm] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const [assignForm, setAssignForm] = useState({
    role_id: "",
  });

  // Состояние для показа/скрытия пароля
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const handleCreateUser = async () => {
    if (!createForm.email.trim() || !createForm.password.trim()) {
      alert("Email и пароль обязательны");
      return;
    }

    if (createForm.password.length < 6) {
      alert("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      const data = await res.json();
      setUsers([...users, data.user]);
      setShowCreateModal(false);
      setCreateForm({ email: "", password: "", full_name: "", role_id: "" });
      toast.show("Пользователь создан", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Create user error:", error);
      toast.show("Ошибка при создании пользователя", { type: "error" });
      alert(error instanceof Error ? error.message : "Ошибка при создании пользователя");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    if (!editForm.email.trim()) {
      alert("Email обязателен");
      return;
    }

    if (editForm.password && editForm.password.length < 6) {
      alert("Пароль должен быть не менее 6 символов");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editForm.email.trim(),
          password: editForm.password || undefined,
          full_name: editForm.full_name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update user");
      }

      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, email: editForm.email.trim(), full_name: editForm.full_name || null }
          : u
      ));
      setShowEditModal(false);
      setSelectedUser(null);
      setEditForm({ email: "", password: "", full_name: "" });
      toast.show("Пользователь обновлён", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Edit user error:", error);
      toast.show("Ошибка при обновлении пользователя", { type: "error" });
      alert(error instanceof Error ? error.message : "Ошибка при обновлении пользователя");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assignForm.role_id) {
      alert("Выберите роль");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: assignForm.role_id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign role");
      }

      const selectedRole = roles.find(r => r.id === assignForm.role_id);
      setUsers(users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, role_id: assignForm.role_id, role_name: selectedRole?.name || null, role_color: selectedRole?.color || null }
          : u
      ));
      setShowAssignModal(false);
      setSelectedUser(null);
      setAssignForm({ role_id: "" });
      toast.show("Роль назначена", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Assign role error:", error);
      toast.show(error instanceof Error ? error.message : "Ошибка при назначении роли", { type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (user: UserRecord) => {
    if (user.is_admin) {
      alert("Невозможно удалить администратора системы");
      return;
    }

    if (!confirm(`Удалить пользователя ${user.email}?`)) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }

      setUsers(users.filter(u => u.id !== user.id));
      toast.show("Пользователь удалён", { type: "success" });
      router.refresh();
    } catch (error) {
      console.error("Delete user error:", error);
      toast.show(error instanceof Error ? error.message : "Ошибка при удалении пользователя", { type: "error" });
    }
  };

  const openEditModal = (user: UserRecord) => {
    setSelectedUser(user);
    setEditForm({ 
      email: user.email, 
      password: "",
      full_name: user.full_name || "" 
    });
    setShowEditModal(true);
  };

  const openAssignModal = (user: UserRecord) => {
    setSelectedUser(user);
    setAssignForm({ role_id: user.role_id || "" });
    setShowAssignModal(true);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name[0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Управление пользователями</h2><p className="text-sm text-muted-foreground">Создавайте пользователей и назначайте роли</p></div><Button onClick={() => setShowCreateModal(true)}><UserPlus className="h-4 w-4 mr-1" />Создать пользователя</Button></div>

      <div className="border rounded-lg overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Пользователь</TableHead><TableHead>Email</TableHead><TableHead>Роль</TableHead><TableHead>Создан</TableHead><TableHead>Посл. вход</TableHead><TableHead className="w-32">Действия</TableHead></TableRow></TableHeader>
          <TableBody>{users.map(user => <TableRow key={user.id}><TableCell><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">{getInitials(user.full_name, user.email)}</div><div><span className="font-medium">{user.full_name || "Не указано"}</span>{user.is_admin && <Badge variant="secondary" className="ml-2 text-xs"><ShieldCheck className="h-3 w-3 mr-1" />Админ</Badge>}</div></div></TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role_name ? <Badge style={{ backgroundColor: user.role_color || "#667eea" }}>{user.role_name}</Badge> : user.is_admin ? <Badge className="bg-yellow-500">Полный доступ</Badge> : <span className="text-muted-foreground text-sm">Без роли</span>}</TableCell><TableCell className="text-sm">{formatDate(user.created_at)}</TableCell><TableCell className="text-sm">{formatDate(user.last_sign_in_at)}</TableCell><TableCell><div className="flex gap-1">{!user.is_admin ? <><Button variant="ghost" size="icon" onClick={() => openEditModal(user)} title="Редактировать"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => openAssignModal(user)} title="Назначить роль"><Award className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteUser(user)} title="Удалить"><Trash2 className="h-4 w-4" /></Button></> : <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" />Защищён</span>}</div></TableCell></TableRow>)}</TableBody>
        </Table>
        {users.length === 0 && <div className="text-center py-12"><Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" /><p>Нет пользователей</p></div>}
      </div>

      {/* Модалка создания */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}><DialogContent><DialogHeader><DialogTitle>Создать пользователя</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Email *</Label><Input type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="user@example.com" /></div>
          <div className="space-y-1"><Label>Пароль *</Label><div className="relative"><Input type={showCreatePassword ? "text" : "password"} value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Минимум 6 символов" /><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowCreatePassword(!showCreatePassword)}>{showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <div className="space-y-1"><Label>Полное имя</Label><Input value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="Иван Иванов" /></div>
          <div className="space-y-1"><Label>Роль</Label><Select value={createForm.role_id} onValueChange={v => setCreateForm({ ...createForm, role_id: v })}><SelectTrigger><SelectValue placeholder="Без роли" /></SelectTrigger><SelectContent><SelectItem value="">Без роли</SelectItem>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSaving}>Отмена</Button><Button onClick={handleCreateUser} disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Создание...</> : 'Создать'}</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Модалка редактирования */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}><DialogContent><DialogHeader><DialogTitle>Редактировать пользователя</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1"><Label>Email *</Label><Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="user@example.com" /></div>
          <div className="space-y-1"><Label>Новый пароль (оставьте пустым)</Label><div className="relative"><Input type={showEditPassword ? "text" : "password"} value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Минимум 6 символов" /><button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowEditPassword(!showEditPassword)}>{showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <div className="space-y-1"><Label>Полное имя</Label><Input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="Иван Иванов" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowEditModal(false)} disabled={isSaving}>Отмена</Button><Button onClick={handleEditUser} disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : 'Сохранить'}</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Модалка назначения роли */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}><DialogContent><DialogHeader><DialogTitle>Назначить роль</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm">Пользователь: <strong>{selectedUser?.email}</strong></p>
          <div className="space-y-1"><Label>Выберите роль</Label><Select value={assignForm.role_id} onValueChange={v => setAssignForm({ role_id: v })}><SelectTrigger><SelectValue placeholder="Без роли" /></SelectTrigger><SelectContent><SelectItem value="">Без роли</SelectItem>{roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowAssignModal(false)} disabled={isSaving}>Отмена</Button><Button onClick={handleAssignRole} disabled={isSaving}>{isSaving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Сохранение...</> : 'Назначить'}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
