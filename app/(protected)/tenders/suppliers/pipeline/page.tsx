"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Kanban, Phone, Mail, Star, MoreVertical } from "lucide-react";

type ParticipantStatus = "new" | "invited" | "offer_received" | "negotiation" | "winner" | "rejected";

const STAGES: { id: ParticipantStatus; name: string; color: string }[] = [
  { id: "new", name: "Новые", color: "bg-gray-100" },
  { id: "invited", name: "Приглашены", color: "bg-blue-100" },
  { id: "offer_received", name: "КП получено", color: "bg-yellow-100" },
  { id: "negotiation", name: "Переговоры", color: "bg-purple-100" },
  { id: "winner", name: "Победитель", color: "bg-green-100" },
  { id: "rejected", name: "Отклонены", color: "bg-red-100" },
];

export default function SupplierPipelinePage() {
  const [selectedTenderId, setSelectedTenderId] = useState<string>("");

  // Демо данные тендеров
  const demoTenders = [
    { id: "1", name: "Поставка оргтехники", number: "0348100045224000001" },
    { id: "2", name: "Канцелярские товары", number: "0348100045224000002" },
    { id: "3", name: "Мебель офисная", number: "0348100045224000003" },
  ];

  // Демо данные участников
  const demoParticipants = selectedTenderId ? [
    {
      id: "p1",
      supplier: { id: "s1", name: "ООО Альфа-Снаб", phone: "+7 495 123-45-67", email: "info@alfa-snab.ru", rating: 4.8 },
      status: "invited" as ParticipantStatus,
    },
    {
      id: "p2",
      supplier: { id: "s2", name: "ООО БетаТрейд", phone: "+7 495 234-56-78", email: "sales@betatrade.ru", rating: 4.5 },
      status: "offer_received" as ParticipantStatus,
      offerAmount: 1250000,
    },
    {
      id: "p3",
      supplier: { id: "s3", name: "ИП Сидоров", phone: "+7 495 345-67-89", rating: 4.2 },
      status: "negotiation" as ParticipantStatus,
      offerAmount: 1180000,
    },
  ] : [];

  const getParticipantsByStage = (stageId: ParticipantStatus) => 
    demoParticipants.filter(p => p.status === stageId);

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amount / 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kanban участников тендера</h1>
          <p className="text-muted-foreground">
            Управление статусами поставщиков в процессе тендера
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center gap-4">
            <CardTitle className="text-base">Выберите тендер</CardTitle>
            <Select value={selectedTenderId} onValueChange={setSelectedTenderId}>
              <SelectTrigger className="w-[400px]">
                <SelectValue placeholder="Выберите тендер..." />
              </SelectTrigger>
              <SelectContent>
                {demoTenders.map((tender) => (
                  <SelectItem key={tender.id} value={tender.id}>
                    {tender.number} - {tender.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {selectedTenderId ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const participants = getParticipantsByStage(stage.id);
            return (
              <div key={stage.id} className={`flex-shrink-0 w-[280px] rounded-lg ${stage.color} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{stage.name}</h3>
                  <Badge variant="secondary">{participants.length}</Badge>
                </div>
                <div className="space-y-2">
                  {participants.map((p) => (
                    <Card key={p.id} className="cursor-grab">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {p.supplier.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{p.supplier.name}</div>
                              {p.supplier.rating && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                  {p.supplier.rating}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                        {p.offerAmount && (
                          <div className="mt-2 text-sm font-medium text-green-600">
                            {formatMoney(p.offerAmount)}
                          </div>
                        )}
                        <div className="flex gap-1 mt-2">
                          {p.supplier.phone && (
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Phone className="h-3 w-3" />
                            </Button>
                          )}
                          {p.supplier.email && (
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="h-[400px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Kanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Выберите тендер для управления участниками</p>
          </div>
        </Card>
      )}
    </div>
  );
}
