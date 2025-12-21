"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Calendar,
  Building2,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface Contract {
  id: string;
  supplier: { id: string; name: string };
  number: string;
  subject: string;
  signed_at: string;
  expires_at: string;
  amount: number;
  status: "active" | "expiring" | "expired" | "draft";
}

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Демо данные
  const contracts: Contract[] = [
    {
      id: "1",
      supplier: { id: "s1", name: "ООО Альфа-Снаб" },
      number: "Д-2024/001",
      subject: "Поставка канцелярских товаров",
      signed_at: new Date(Date.now() - 86400000 * 180).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 185).toISOString(),
      amount: 2500000,
      status: "active",
    },
    {
      id: "2",
      supplier: { id: "s2", name: "ООО БетаТрейд" },
      number: "Д-2024/015",
      subject: "Поставка оргтехники",
      signed_at: new Date(Date.now() - 86400000 * 300).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 25).toISOString(),
      amount: 5800000,
      status: "expiring",
    },
    {
      id: "3",
      supplier: { id: "s3", name: "ИП Сидоров" },
      number: "Д-2023/089",
      subject: "Услуги по обслуживанию",
      signed_at: new Date(Date.now() - 86400000 * 400).toISOString(),
      expires_at: new Date(Date.now() - 86400000 * 35).toISOString(),
      amount: 1200000,
      status: "expired",
    },
  ];

  const filteredContracts = contracts.filter(c =>
    c.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: Contract["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Действует</Badge>;
      case "expiring":
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Истекает</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Истёк</Badge>;
      case "draft":
        return <Badge variant="outline">Черновик</Badge>;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Договоры</h1>
          <p className="text-muted-foreground">
            Управление договорами с поставщиками
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Новый договор
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{contracts.length}</div>
            <div className="text-sm text-muted-foreground">Всего договоров</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {contracts.filter(c => c.status === "active").length}
            </div>
            <div className="text-sm text-muted-foreground">Действующих</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {contracts.filter(c => c.status === "expiring").length}
            </div>
            <div className="text-sm text-muted-foreground">Истекают скоро</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {formatAmount(contracts.reduce((sum, c) => sum + c.amount, 0))}
            </div>
            <div className="text-sm text-muted-foreground">Общая сумма</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по номеру, предмету или поставщику..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{contract.number}</div>
                    <div className="text-sm">{contract.subject}</div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {contract.supplier.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        до {new Date(contract.expires_at).toLocaleDateString("ru")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{formatAmount(contract.amount)}</div>
                    {getStatusBadge(contract.status)}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
