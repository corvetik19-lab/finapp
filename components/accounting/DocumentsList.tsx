"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Download,
  MoreHorizontal,
  ArrowLeft
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  AccountingDocument, 
  DOCUMENT_TYPES, 
  DOCUMENT_STATUSES,
  DocumentType,
  DocumentStatus,
  formatMoney,
  formatDate
} from "@/lib/accounting/types";

interface DocumentsListProps {
  documents: AccountingDocument[];
}

export function DocumentsList({ documents }: DocumentsListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Фильтрация документов
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.document_number.toLowerCase().includes(search.toLowerCase()) ||
      doc.counterparty_name.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Статистика
  const stats = {
    total: documents.length,
    draft: documents.filter(d => d.status === 'draft').length,
    issued: documents.filter(d => d.status === 'issued').length,
    paid: documents.filter(d => d.status === 'paid').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Документы
            </h1>
            <p className="text-muted-foreground">
              Счета, акты, накладные и другие документы
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/tenders/accounting/documents/new">
            <Plus className="h-4 w-4 mr-2" />
            Новый документ
          </Link>
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего документов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Черновики
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Выставлены
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.issued}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Оплачены
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.paid}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по номеру или контрагенту..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Тип документа" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {Object.entries(DOCUMENT_TYPES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(DOCUMENT_STATUSES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица документов */}
      <Card>
        <CardContent className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Документы не найдены</h3>
              <p className="text-muted-foreground mb-4">
                {documents.length === 0
                  ? "Создайте первый документ"
                  : "Попробуйте изменить фильтры"
                }
              </p>
              <Button asChild>
                <Link href="/tenders/accounting/documents/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать документ
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Контрагент</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const typeInfo = DOCUMENT_TYPES[doc.document_type as DocumentType];
                  const statusInfo = DOCUMENT_STATUSES[doc.status as DocumentStatus];
                  
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Link 
                          href={`/tenders/accounting/documents/${doc.id}`}
                          className="font-medium hover:underline"
                        >
                          {doc.document_number}
                        </Link>
                      </TableCell>
                      <TableCell>{typeInfo?.name || doc.document_type}</TableCell>
                      <TableCell>{formatDate(doc.document_date)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{doc.counterparty_name}</div>
                          {doc.counterparty_inn && (
                            <div className="text-sm text-muted-foreground">
                              ИНН: {doc.counterparty_inn}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(doc.total)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: `${statusInfo?.color}20`,
                            color: statusInfo?.color 
                          }}
                        >
                          {statusInfo?.name || doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/tenders/accounting/documents/${doc.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Просмотр
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Скачать PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
