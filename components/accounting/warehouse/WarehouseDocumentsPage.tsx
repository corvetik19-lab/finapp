"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, FileText, Plus, MoreVertical, ArrowDown, ArrowUp, ArrowRightLeft } from "lucide-react";
import { WarehouseDocument, documentTypeLabels, documentStatusLabels } from "@/lib/accounting/warehouse/types";

interface WarehouseDocumentsPageProps {
  documents: WarehouseDocument[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

function getDocumentIcon(type: string) {
  switch (type) {
    case "receipt":
      return <ArrowDown className="h-4 w-4 text-emerald-500" />;
    case "shipment":
      return <ArrowUp className="h-4 w-4 text-red-500" />;
    case "transfer":
      return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "outline",
    confirmed: "default",
    cancelled: "destructive",
  };
  return (
    <Badge variant={variants[status] || "secondary"}>
      {documentStatusLabels[status as keyof typeof documentStatusLabels] || status}
    </Badge>
  );
}

export function WarehouseDocumentsPage({ documents }: WarehouseDocumentsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.document_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const docsByType = documents.reduce((acc, doc) => {
    acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Складские документы</h1>
          <p className="text-muted-foreground">
            Приходные и расходные документы
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать документ
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <ArrowDown className="h-4 w-4 mr-2 text-emerald-500" />
              Приходная накладная
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowUp className="h-4 w-4 mr-2 text-red-500" />
              Расходная накладная
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ArrowRightLeft className="h-4 w-4 mr-2 text-blue-500" />
              Перемещение
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="h-4 w-4 mr-2" />
              Инвентаризация
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего документов</div>
                <div className="text-2xl font-bold">{documents.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowDown className="h-4 w-4 text-emerald-500" />
              Приходных
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {docsByType["receipt"] || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUp className="h-4 w-4 text-red-500" />
              Расходных
            </div>
            <div className="text-2xl font-bold text-red-600">
              {docsByType["shipment"] || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowRightLeft className="h-4 w-4 text-blue-500" />
              Перемещений
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {docsByType["transfer"] || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру документа..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(documentTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(documentStatusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Документы ({filteredDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Номер</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Склад</TableHead>
                <TableHead>Контрагент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{getDocumentIcon(doc.document_type)}</TableCell>
                  <TableCell className="font-mono font-medium">
                    {doc.document_number}
                  </TableCell>
                  <TableCell>{formatDate(doc.document_date)}</TableCell>
                  <TableCell>
                    {documentTypeLabels[doc.document_type as keyof typeof documentTypeLabels] || doc.document_type}
                  </TableCell>
                  <TableCell>
                    {(doc.warehouse as WarehouseDocument["warehouse"] & { name?: string })?.name || "—"}
                  </TableCell>
                  <TableCell>
                    {(doc.counterparty as WarehouseDocument["counterparty"] & { short_name?: string })?.short_name || "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Открыть</DropdownMenuItem>
                        <DropdownMenuItem>Печать</DropdownMenuItem>
                        {doc.status === "draft" && (
                          <>
                            <DropdownMenuItem>Провести</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Удалить
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDocs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Документы не найдены</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
