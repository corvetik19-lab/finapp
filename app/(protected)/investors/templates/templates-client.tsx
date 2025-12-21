"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast/ToastContext";
import {
  FileText,
  Plus,
  Edit,
  Copy,
  Trash2,
  Eye,
  Code,
} from "lucide-react";

interface ContractTemplate {
  id: string;
  name: string;
  template_type: string;
  content: string;
  variables: string[];
  is_default: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const templateTypeLabels: Record<string, string> = {
  loan_agreement: "Договор займа",
  reconciliation_act: "Акт сверки",
  investor_report: "Отчёт инвестору",
  guarantee_contract: "Договор гарантии",
  custom: "Пользовательский",
};

const defaultVariables = [
  "{{investor_name}}",
  "{{investor_email}}",
  "{{investment_number}}",
  "{{investment_amount}}",
  "{{interest_rate}}",
  "{{start_date}}",
  "{{end_date}}",
  "{{tender_subject}}",
  "{{company_name}}",
  "{{current_date}}",
];

export function TemplatesPageClient() {
  const { show } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    template_type: "loan_agreement",
    content: "",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch("/api/investors/templates");
      if (response.ok) {
        const { data } = await response.json();
        setTemplates(data || []);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      show("Заполните все поля", { type: "error" });
      return;
    }

    try {
      const url = editMode && selectedTemplate
        ? `/api/investors/templates/${selectedTemplate.id}`
        : "/api/investors/templates";
      
      const response = await fetch(url, {
        method: editMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        show(editMode ? "Шаблон обновлён" : "Шаблон создан", { type: "success" });
        setDialogOpen(false);
        resetForm();
        loadTemplates();
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      show("Ошибка сохранения", { type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить шаблон?")) return;

    try {
      const response = await fetch(`/api/investors/templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        show("Шаблон удалён", { type: "success" });
        loadTemplates();
      }
    } catch {
      show("Ошибка удаления", { type: "error" });
    }
  };

  const handleEdit = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      content: template.content,
    });
    setEditMode(true);
    setDialogOpen(true);
  };

  const handleDuplicate = (template: ContractTemplate) => {
    setFormData({
      name: `${template.name} (копия)`,
      template_type: template.template_type,
      content: template.content,
    });
    setEditMode(false);
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const handlePreview = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", template_type: "loan_agreement", content: "" });
    setEditMode(false);
    setSelectedTemplate(null);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Шаблоны договоров</h1>
          <p className="text-muted-foreground">
            Создавайте и редактируйте шаблоны документов для инвесторов
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Новый шаблон
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? "Редактирование шаблона" : "Новый шаблон"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Договор займа (стандартный)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип документа</Label>
                  <Select
                    value={formData.template_type}
                    onValueChange={(v) => setFormData({ ...formData, template_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(templateTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Содержимое шаблона</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Введите текст шаблона с переменными..."
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Доступные переменные
                </h4>
                <div className="flex flex-wrap gap-2">
                  {defaultVariables.map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-100"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          content: formData.content + " " + v,
                        });
                      }}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleSave}>
                  {editMode ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium">Нет шаблонов</p>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте первый шаблон договора
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Создать шаблон
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {templateTypeLabels[template.template_type] || template.template_type}
                    </Badge>
                  </div>
                  {template.is_default && (
                    <Badge>По умолчанию</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {template.content.substring(0, 100)}...
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>Версия {template.version}</span>
                  <span>
                    {new Date(template.updated_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(template)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="bg-slate-50 rounded-lg p-6 font-mono text-sm whitespace-pre-wrap">
            {selectedTemplate?.content}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
