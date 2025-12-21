"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Send,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  Loader2,
  Plus,
  Trash2,
  FileText,
  Calendar,
  BarChart3,
} from "lucide-react";

// =====================================================
// Компонент email-кампаний
// =====================================================

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  recipientCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

interface SupplierEmailCampaignProps {
  campaigns: Campaign[];
  templates: EmailTemplate[];
  onCreateCampaign: (data: {
    name: string;
    subject: string;
    body: string;
    templateId?: string;
    scheduledAt?: string;
  }) => Promise<void>;
  onSendCampaign: (campaignId: string) => Promise<void>;
  onDeleteCampaign: (campaignId: string) => Promise<void>;
  onAddRecipients: (campaignId: string, filter: Record<string, unknown>) => Promise<number>;
}

const CAMPAIGN_STATUS = {
  draft: { label: "Черновик", color: "bg-gray-100 text-gray-800", icon: FileText },
  scheduled: { label: "Запланировано", color: "bg-blue-100 text-blue-800", icon: Calendar },
  sending: { label: "Отправляется", color: "bg-yellow-100 text-yellow-800", icon: Loader2 },
  sent: { label: "Отправлено", color: "bg-green-100 text-green-800", icon: CheckCircle },
  cancelled: { label: "Отменено", color: "bg-red-100 text-red-800", icon: XCircle },
};

const EMAIL_VARIABLES = [
  { key: "{{company_name}}", label: "Название компании" },
  { key: "{{contact_name}}", label: "Имя контакта" },
  { key: "{{tender_name}}", label: "Название тендера" },
  { key: "{{tender_deadline}}", label: "Срок подачи" },
  { key: "{{our_company}}", label: "Наша компания" },
];

export function SupplierEmailCampaign({
  campaigns,
  templates,
  onCreateCampaign,
  onSendCampaign,
  onDeleteCampaign,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddRecipients,
}: SupplierEmailCampaignProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleCreate = async () => {
    if (!campaignName || !subject || !body) return;

    setIsCreating(true);
    try {
      await onCreateCampaign({
        name: campaignName,
        subject,
        body,
        templateId: selectedTemplate || undefined,
      });
      setShowCreateDialog(false);
      resetForm();
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setCampaignName("");
    setSubject("");
    setBody("");
    setSelectedTemplate("");
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email-рассылки
          </h2>
          <p className="text-muted-foreground">
            Массовые рассылки поставщикам
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новая рассылка
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Всего</span>
            </div>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Отправлено</span>
            </div>
            <div className="text-2xl font-bold">
              {campaigns.filter((c) => c.status === "sent").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Открыто</span>
            </div>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.openedCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Кликов</span>
            </div>
            <div className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + c.clickedCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список кампаний */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Кампании</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-center">Получателей</TableHead>
                <TableHead className="text-center">Открытий</TableHead>
                <TableHead className="text-center">Open Rate</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const statusConfig = CAMPAIGN_STATUS[campaign.status];
                const StatusIcon = statusConfig.icon;
                const openRate =
                  campaign.sentCount > 0
                    ? Math.round((campaign.openedCount / campaign.sentCount) * 100)
                    : 0;

                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {campaign.subject}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {campaign.recipientCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {campaign.openedCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={openRate} className="w-16 h-2" />
                        <span className="text-sm">{openRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {campaign.sentAt
                        ? new Date(campaign.sentAt).toLocaleDateString("ru-RU")
                        : new Date(campaign.createdAt).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {campaign.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => onSendCampaign(campaign.id)}
                              disabled={campaign.recipientCount === 0}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDeleteCampaign(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {campaign.status === "sent" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedCampaign(campaign)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Нет кампаний. Создайте первую рассылку.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Диалог создания кампании */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Новая email-рассылка</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название кампании</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Приглашение в тендер #123"
                />
              </div>
              <div className="space-y-2">
                <Label>Шаблон</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите шаблон" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Тема письма</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Приглашение к участию в тендере"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Текст письма</Label>
                <div className="flex gap-1">
                  {EMAIL_VARIABLES.map((v) => (
                    <Button
                      key={v.key}
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => insertVariable(v.key)}
                    >
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Текст письма..."
                rows={10}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !campaignName || !subject || !body}
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог статистики */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Статистика рассылки</DialogTitle>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{selectedCampaign.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedCampaign.subject}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-accent rounded-lg text-center">
                  <div className="text-2xl font-bold">{selectedCampaign.sentCount}</div>
                  <div className="text-sm text-muted-foreground">Отправлено</div>
                </div>
                <div className="p-4 bg-accent rounded-lg text-center">
                  <div className="text-2xl font-bold">{selectedCampaign.openedCount}</div>
                  <div className="text-sm text-muted-foreground">Открыто</div>
                </div>
                <div className="p-4 bg-accent rounded-lg text-center">
                  <div className="text-2xl font-bold">{selectedCampaign.clickedCount}</div>
                  <div className="text-sm text-muted-foreground">Кликов</div>
                </div>
                <div className="p-4 bg-accent rounded-lg text-center">
                  <div className="text-2xl font-bold">
                    {selectedCampaign.sentCount > 0
                      ? Math.round((selectedCampaign.openedCount / selectedCampaign.sentCount) * 100)
                      : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Open Rate</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
