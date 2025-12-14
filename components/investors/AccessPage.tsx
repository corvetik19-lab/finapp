"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Mail, Trash2, Copy, Check, Shield } from "lucide-react";
import type { InvestorAccess, InvestmentSource, CreateAccessInput } from "@/lib/investors/types";
import { ACCESS_STATUS_LABELS } from "@/lib/investors/types";
import { createInvestorAccess, updateInvestorAccess, deleteInvestorAccess } from "@/lib/investors/service";
import { useToast } from "@/components/toast/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AccessPageProps {
  accessList: InvestorAccess[];
  sources: InvestmentSource[];
}

export function AccessPage({ accessList: initialList, sources }: AccessPageProps) {
  const router = useRouter();
  const { show } = useToast();
  const [accessList, setAccessList] = useState(initialList);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateAccessInput>({
    source_id: "",
    investor_email: "",
    can_view_tender_details: true,
    can_view_documents: false,
    can_view_financials: true,
    can_download_reports: true,
  });

  const resetForm = () => {
    setFormData({
      source_id: "",
      investor_email: "",
      can_view_tender_details: true,
      can_view_documents: false,
      can_view_financials: true,
      can_download_reports: true,
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source_id || !formData.investor_email) {
      show("Заполните обязательные поля", { type: "error" });
      return;
    }

    setLoading(true);
    try {
      const created = await createInvestorAccess(formData);
      setAccessList((prev) => [created, ...prev]);
      show("Приглашение создано", { type: "success" });
      resetForm();
      router.refresh();
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Отозвать доступ?")) return;
    try {
      await updateInvestorAccess(id, { status: "revoked" });
      setAccessList((prev) => prev.map((a) => (a.id === id ? { ...a, status: "revoked" as const } : a)));
      show("Доступ отозван", { type: "success" });
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить?")) return;
    try {
      await deleteInvestorAccess(id);
      setAccessList((prev) => prev.filter((a) => a.id !== id));
      show("Удалено", { type: "success" });
    } catch (error) {
      show(error instanceof Error ? error.message : "Ошибка", { type: "error" });
    }
  };

  const copyInviteLink = (access: InvestorAccess) => {
    if (access.invite_token) {
      navigator.clipboard.writeText(`${window.location.origin}/investor-portal/invite/${access.invite_token}`);
      setCopiedId(access.id);
      setTimeout(() => setCopiedId(null), 2000);
      show("Скопировано", { type: "success" });
    }
  };

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    active: "default",
    revoked: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Доступ инвесторов</h1>
          <p className="text-muted-foreground">Управление доступом к порталу</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={loading}>
          <Plus className="mr-2 h-4 w-4" />
          Пригласить
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Новое приглашение</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Источник *</Label>
                  <Select value={formData.source_id} onValueChange={(v) => setFormData({ ...formData, source_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email инвестора *</Label>
                  <Input
                    type="email"
                    value={formData.investor_email}
                    onChange={(e) => setFormData({ ...formData, investor_email: e.target.value })}
                    placeholder="investor@example.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Детали тендеров</Label>
                  <Switch
                    checked={formData.can_view_tender_details}
                    onCheckedChange={(v) => setFormData({ ...formData, can_view_tender_details: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Документы</Label>
                  <Switch
                    checked={formData.can_view_documents}
                    onCheckedChange={(v) => setFormData({ ...formData, can_view_documents: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Финансы</Label>
                  <Switch
                    checked={formData.can_view_financials}
                    onCheckedChange={(v) => setFormData({ ...formData, can_view_financials: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Скачивание отчётов</Label>
                  <Switch
                    checked={formData.can_download_reports}
                    onCheckedChange={(v) => setFormData({ ...formData, can_download_reports: v })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Отмена</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Создание..." : "Создать"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {accessList.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">Нет приглашений</h3>
          <p className="text-muted-foreground text-sm">Пригласите инвестора для доступа к порталу</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Права</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessList.map((access) => (
                <TableRow key={access.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {access.investor_email}
                    </div>
                  </TableCell>
                  <TableCell>{access.source?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {access.can_view_tender_details && <Badge variant="outline">Тендеры</Badge>}
                      {access.can_view_financials && <Badge variant="outline">Финансы</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[access.status] || "secondary"}>
                      {ACCESS_STATUS_LABELS[access.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {access.invite_token && access.status === "pending" && (
                        <Button variant="ghost" size="icon" onClick={() => copyInviteLink(access)}>
                          {copiedId === access.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                      {access.status === "active" && (
                        <Button variant="ghost" size="icon" onClick={() => handleRevoke(access.id)}>
                          <Shield className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(access.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
