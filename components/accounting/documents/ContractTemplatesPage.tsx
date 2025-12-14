"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  FileText,
  CheckCircle,
  Eye,
  Loader2,
  Download,
  Copy,
  FileSignature,
  Lock,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import {
  generateContract,
  CONTRACT_TYPES,
  type ContractTemplate,
  type GeneratedContract,
} from "@/lib/accounting/documents/contract-templates";
import type { AccountingCounterparty } from "@/lib/accounting/types";

interface ContractTemplatesPageProps {
  templates: ContractTemplate[];
  contracts: GeneratedContract[];
  counterparties: AccountingCounterparty[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Черновик", variant: "outline" },
    signed: { label: "Подписан", variant: "secondary" },
    active: { label: "Действует", variant: "default" },
    completed: { label: "Исполнен", variant: "secondary" },
    cancelled: { label: "Расторгнут", variant: "destructive" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ContractTemplatesPage({ templates, contracts, counterparties }: ContractTemplatesPageProps) {
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState<"templates" | "contracts">("templates");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");
  
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleSelectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    // Инициализируем значения по умолчанию
    const defaults: Record<string, string> = {};
    template.variables.forEach(v => {
      if (v.default_value) {
        defaults[v.key] = v.default_value;
      }
    });
    setFormValues(defaults);
    setPreviewContent("");
    setIsGenerateOpen(true);
  };

  const handlePreview = () => {
    if (!selectedTemplate) return;
    
    let content = selectedTemplate.content;
    for (const [key, value] of Object.entries(formValues)) {
      content = content.replace(new RegExp(`{{${key}}}`, "g"), value || `[${key}]`);
    }
    setPreviewContent(content);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;
    
    // Проверяем обязательные поля
    const missing = selectedTemplate.variables
      .filter(v => v.required && !formValues[v.key])
      .map(v => v.label);
    
    if (missing.length > 0) {
      show(`Заполните: ${missing.join(", ")}`, { type: "error" });
      return;
    }
    
    setLoading(true);
    try {
      const result = await generateContract(
        selectedTemplate.id!,
        formValues
      );
      
      if (result.success) {
        show("Договор сгенерирован", { type: "success" });
        setIsGenerateOpen(false);
        window.location.reload();
      } else {
        show(result.error || "Ошибка генерации", { type: "error" });
      }
    } catch (error) {
      show("Ошибка при генерации", { type: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileSignature className="h-7 w-7 text-primary" />
              Шаблоны договоров
            </h1>
            <p className="text-muted-foreground">
              Конструктор договоров с автозаполнением
            </p>
          </div>
        </div>
      </div>

      {/* Generate Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Заполните переменные для генерации договора
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="grid gap-6 md:grid-cols-2 py-4">
              {/* Форма */}
              <div className="space-y-4">
                <h4 className="font-medium">Заполните данные</h4>
                
                {selectedTemplate.variables.map(variable => (
                  <div key={variable.key} className="space-y-2">
                    <Label>
                      {variable.label}
                      {variable.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {variable.type === "textarea" ? (
                      <Textarea
                        value={formValues[variable.key] || ""}
                        onChange={e => setFormValues({ ...formValues, [variable.key]: e.target.value })}
                        placeholder={variable.placeholder}
                        rows={3}
                      />
                    ) : variable.type === "select" ? (
                      <Select
                        value={formValues[variable.key] || ""}
                        onValueChange={v => setFormValues({ ...formValues, [variable.key]: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите..." />
                        </SelectTrigger>
                        <SelectContent>
                          {variable.options?.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={variable.type === "date" ? "date" : variable.type === "number" ? "number" : "text"}
                        value={formValues[variable.key] || ""}
                        onChange={e => setFormValues({ ...formValues, [variable.key]: e.target.value })}
                        placeholder={variable.placeholder}
                      />
                    )}
                  </div>
                ))}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handlePreview} className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Предпросмотр
                  </Button>
                  <Button onClick={handleGenerate} disabled={loading} className="flex-1">
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Создать договор
                  </Button>
                </div>
              </div>

              {/* Превью */}
              <div className="space-y-4">
                <h4 className="font-medium">Предпросмотр</h4>
                <div className="border rounded-lg p-4 bg-muted/30 max-h-[500px] overflow-auto">
                  {previewContent ? (
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {previewContent}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Нажмите &quot;Предпросмотр&quot; для просмотра договора
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="templates">Шаблоны ({templates.length})</TabsTrigger>
          <TabsTrigger value="contracts">Договоры ({contracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {template.is_system && <Lock className="h-4 w-4 text-muted-foreground" />}
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {CONTRACT_TYPES.find(t => t.value === template.contract_type)?.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {template.variables.length} переменных
                    </p>
                    <Button size="sm" onClick={() => handleSelectTemplate(template)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Создать
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {templates.length === 0 && (
              <Card className="md:col-span-3">
                <CardContent className="pt-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет шаблонов договоров</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {contracts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>№</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Контрагент</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map(contract => {
                      const template = templates.find(t => t.id === contract.template_id);
                      return (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            {contract.contract_number}
                          </TableCell>
                          <TableCell>{formatDate(contract.contract_date)}</TableCell>
                          <TableCell>{contract.counterparty_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {template?.name || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(contract.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Нет сгенерированных договоров</p>
                  <p className="text-sm mt-2">
                    Выберите шаблон и создайте договор
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
