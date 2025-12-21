"use client";

import { useState } from "react";
import { SupplierVerificationCard } from "@/components/suppliers/SupplierVerificationCard";
import { SupplierDaDataEnrich } from "@/components/suppliers/SupplierDaDataEnrich";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, AlertTriangle, CheckCircle } from "lucide-react";

export default function SupplierVerificationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<{
    id: string;
    name: string;
    inn: string;
  } | null>(null);

  // Демо данные для примера
  const demoSuppliers = [
    { id: "1", name: "ООО Альфа-Снаб", inn: "7701234567", status: "verified", riskScore: 15 },
    { id: "2", name: "ООО БетаТрейд", inn: "7702345678", status: "pending", riskScore: 45 },
    { id: "3", name: "ИП Иванов А.А.", inn: "770312345678", status: "warning", riskScore: 72 },
  ];

  const filteredSuppliers = demoSuppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.inn.includes(searchQuery)
  );

  const getStatusBadge = (status: string, riskScore: number) => {
    if (status === "verified" && riskScore < 30) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Проверен</Badge>;
    }
    if (riskScore > 50) {
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Риск</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800"><ShieldCheck className="h-3 w-3 mr-1" />Ожидает</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Верификация поставщиков</h1>
          <p className="text-muted-foreground">
            Проверка и обогащение данных поставщиков через DaData, ФНС, РНП
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список поставщиков */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Поставщики</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию или ИНН..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className={`p-3 rounded-lg border cursor-pointer hover:bg-accent ${
                  selectedSupplier?.id === supplier.id ? "bg-accent border-primary" : ""
                }`}
                onClick={() => setSelectedSupplier(supplier)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-sm text-muted-foreground">ИНН: {supplier.inn}</div>
                  </div>
                  {getStatusBadge(supplier.status, supplier.riskScore)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Детали верификации */}
        <div className="lg:col-span-2 space-y-4">
          {selectedSupplier ? (
            <>
              <Card>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{selectedSupplier.name}</CardTitle>
                    <SupplierDaDataEnrich
                      supplierId={selectedSupplier.id}
                      currentInn={selectedSupplier.inn}
                      onEnrich={async () => null}
                      onApplyData={async () => {}}
                    />
                  </div>
                </CardHeader>
              </Card>

              <SupplierVerificationCard
                supplierId={selectedSupplier.id}
                inn={selectedSupplier.inn}
                onRunVerification={async () => ({
                  supplierId: selectedSupplier.id,
                  riskScore: 25,
                  riskLevel: "low" as const,
                  checks: [
                    { type: "fns", name: "ФНС", status: "clean" as const, message: "Организация действующая" },
                    { type: "rnp", name: "РНП", status: "clean" as const, message: "Не найден в РНП" },
                    { type: "arbitr", name: "Арбитраж", status: "warning" as const, message: "Найдено 2 завершённых дела" },
                    { type: "fssp", name: "ФССП", status: "clean" as const, message: "Исполнительных производств нет" },
                  ],
                  verifiedAt: new Date().toISOString(),
                })}
              />
            </>
          ) : (
            <Card className="h-[400px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Выберите поставщика для проверки</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
