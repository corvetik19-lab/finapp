"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Download,
  Search,
  FileCheck,
  FileClock,
  FileSignature,
  Calendar,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  type: "contract" | "act" | "report" | "invoice";
  status: "signed" | "pending" | "draft";
  date: string;
  investment_number: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Договор займа №2024-001",
    type: "contract",
    status: "signed",
    date: "2024-01-15",
    investment_number: "INV-2024-001",
  },
  {
    id: "2",
    name: "Акт сверки за январь 2024",
    type: "act",
    status: "signed",
    date: "2024-02-01",
    investment_number: "INV-2024-001",
  },
  {
    id: "3",
    name: "Ежемесячный отчёт февраль 2024",
    type: "report",
    status: "signed",
    date: "2024-03-01",
    investment_number: "INV-2024-001",
  },
  {
    id: "4",
    name: "Договор займа №2024-015",
    type: "contract",
    status: "pending",
    date: "2024-03-10",
    investment_number: "INV-2024-015",
  },
];

const typeIcons: Record<string, typeof FileText> = {
  contract: FileSignature,
  act: FileCheck,
  report: FileText,
  invoice: FileClock,
};

const statusLabels: Record<string, string> = {
  signed: "Подписан",
  pending: "На подписании",
  draft: "Черновик",
};

const statusColors: Record<string, "default" | "secondary" | "outline"> = {
  signed: "default",
  pending: "outline",
  draft: "secondary",
};

export default function InvestorDocumentsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = mockDocuments.filter((doc) => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (typeFilter !== "all" && doc.type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Документы</h1>
        <p className="text-muted-foreground">Договоры, акты и отчёты по вашим инвестициям</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск документов..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("all")}
              >
                Все
              </Button>
              <Button
                variant={typeFilter === "contract" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("contract")}
              >
                <FileSignature className="h-4 w-4 mr-1" />
                Договоры
              </Button>
              <Button
                variant={typeFilter === "act" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("act")}
              >
                <FileCheck className="h-4 w-4 mr-1" />
                Акты
              </Button>
              <Button
                variant={typeFilter === "report" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("report")}
              >
                <FileText className="h-4 w-4 mr-1" />
                Отчёты
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Документы не найдены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((doc) => {
            const Icon = typeIcons[doc.type] || FileText;

            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 rounded-lg">
                        <Icon className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(doc.date).toLocaleDateString("ru-RU")}
                          </span>
                          <span>{doc.investment_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant={statusColors[doc.status]}>
                        {statusLabels[doc.status]}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Скачать
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Электронная подпись
          </CardTitle>
          <CardDescription className="text-blue-700">
            Документы со статусом «На подписании» можно подписать электронной подписью прямо в портале.
            Функция находится в разработке.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
