"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FileText,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  EmailTemplate,
  SupplierEmail,
  sendEmail,
  applyTemplate,
} from "@/lib/suppliers/email-service";
import { EMAIL_TEMPLATE_TYPES } from "@/lib/suppliers/email-constants";
import { Supplier } from "@/lib/suppliers/types";
import { useRouter } from "next/navigation";

interface SupplierEmailComposerProps {
  supplier: Supplier;
  templates: EmailTemplate[];
  emails: SupplierEmail[];
}

export function SupplierEmailComposer({
  supplier,
  templates,
  emails,
}: SupplierEmailComposerProps) {
  const router = useRouter();
  const [composeOpen, setComposeOpen] = useState(false);
  const [loading, setSending] = useState(false);

  // Compose form state
  const [toEmail, setToEmail] = useState(supplier.email || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const resetForm = () => {
    setToEmail(supplier.email || "");
    setSubject("");
    setBody("");
    setSelectedTemplateId("");
  };

  const handleTemplateSelect = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        const variables = {
          supplier_name: supplier.name,
          company_name: "", // TODO: из настроек
          date: new Date().toLocaleDateString("ru-RU"),
        };
        const { subject: newSubject, body: newBody } = await applyTemplate(template, variables);
        setSubject(newSubject);
        setBody(newBody);
      }
    }
  };

  const handleSend = async () => {
    if (!toEmail || !subject || !body) return;

    setSending(true);
    try {
      const result = await sendEmail({
        supplier_id: supplier.id,
        to_email: toEmail,
        subject,
        body,
        template_id: selectedTemplateId || undefined,
      });

      if (result.success) {
        resetForm();
        setComposeOpen(false);
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Отправлено
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Ошибка
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Черновик
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Email переписка</h3>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setComposeOpen(true);
          }}
          disabled={!supplier.email}
        >
          <Mail className="h-4 w-4 mr-1" />
          Написать
        </Button>
      </div>

      {!supplier.email && (
        <Card>
          <CardContent className="py-4 text-center text-gray-500">
            <Mail className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Email поставщика не указан</p>
          </CardContent>
        </Card>
      )}

      {emails.length === 0 && supplier.email && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет отправленных писем</p>
          </CardContent>
        </Card>
      )}

      {emails.length > 0 && (
        <div className="space-y-3">
          {emails.map((email) => (
            <Card key={email.id} className="hover:bg-gray-50">
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="font-medium truncate">{email.subject}</span>
                      {getStatusBadge(email.status)}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      Кому: {email.to_email}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(email.sent_at || email.created_at)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Новое письмо для {supplier.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {templates.length > 0 && (
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Шаблон</label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите шаблон или напишите вручную" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без шаблона</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {t.name}
                          <Badge variant="outline" className="text-xs">
                            {EMAIL_TEMPLATE_TYPES[t.template_type]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Кому *</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Тема *</label>
              <Input
                placeholder="Тема письма"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500 mb-1 block">Сообщение *</label>
              <Textarea
                placeholder="Текст письма..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-gray-400 mt-1">
                Переменные: {"{{supplier_name}}"}, {"{{date}}"}, {"{{company_name}}"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading || !toEmail || !subject || !body}
            >
              {loading ? (
                "Отправка..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Отправить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
