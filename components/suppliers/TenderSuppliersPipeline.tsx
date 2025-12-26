"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MoreVertical,
  Phone,
  Mail,
  DollarSign,
  Trophy,
  X,
  Star,
} from "lucide-react";
import { formatMoney } from "@/lib/utils/format";

// =====================================================
// Kanban участников тендера
// =====================================================

export interface TenderParticipant {
  id: string;
  supplier_id: string;
  tender_id: string;
  supplier: {
    id: string;
    name: string;
    short_name?: string;
    inn?: string;
    phone?: string;
    email?: string;
    rating?: number;
  };
  status: ParticipantStatus;
  invited_at?: string;
  offer_amount?: number;
  offer_currency?: string;
  offer_delivery_days?: number;
  offer_payment_terms?: string;
  offer_received_at?: string;
  evaluation_score?: number;
  evaluation_notes?: string;
  rejection_reason?: string;
}

export type ParticipantStatus =
  | "invited"
  | "confirmed"
  | "requested_tz"
  | "offer_received"
  | "reviewing"
  | "negotiating"
  | "winner"
  | "rejected"
  | "reserve";

const PARTICIPANT_STATUSES: Record<ParticipantStatus, { name: string; color: string }> = {
  invited: { name: "Приглашён", color: "bg-blue-100 text-blue-800" },
  confirmed: { name: "Подтвердил", color: "bg-cyan-100 text-cyan-800" },
  requested_tz: { name: "Запросил ТЗ", color: "bg-purple-100 text-purple-800" },
  offer_received: { name: "Прислал КП", color: "bg-amber-100 text-amber-800" },
  reviewing: { name: "На рассмотрении", color: "bg-orange-100 text-orange-800" },
  negotiating: { name: "Переговоры", color: "bg-indigo-100 text-indigo-800" },
  winner: { name: "Победитель", color: "bg-green-100 text-green-800" },
  rejected: { name: "Отклонён", color: "bg-red-100 text-red-800" },
  reserve: { name: "Резерв", color: "bg-gray-100 text-gray-800" },
};

const PIPELINE_STAGES: ParticipantStatus[] = [
  "invited",
  "confirmed",
  "requested_tz",
  "offer_received",
  "reviewing",
  "negotiating",
];

interface TenderSuppliersPipelineProps {
  tenderId: string;
  participants: TenderParticipant[];
  onStatusChange: (participantId: string, newStatus: ParticipantStatus) => Promise<void>;
  onRecordOffer: (participantId: string, offer: {
    amount: number;
    deliveryDays?: number;
    paymentTerms?: string;
  }) => Promise<void>;
  onSetWinner: (participantId: string) => Promise<void>;
  onReject: (participantId: string, reason: string) => Promise<void>;
  onSendInvitation: (supplierId: string) => Promise<void>;
}

export function TenderSuppliersPipeline({
  tenderId: _tenderId,
  participants,
  onStatusChange,
  onRecordOffer,
  onSetWinner,
  onReject,
}: TenderSuppliersPipelineProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<TenderParticipant | null>(null);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Группируем участников по статусам
  const participantsByStatus = PIPELINE_STAGES.reduce((acc, status) => {
    acc[status] = participants.filter((p) => p.status === status);
    return acc;
  }, {} as Record<ParticipantStatus, TenderParticipant[]>);

  // Победители и отклонённые отдельно
  const winners = participants.filter((p) => p.status === "winner");
  const rejected = participants.filter((p) => p.status === "rejected");
  const reserves = participants.filter((p) => p.status === "reserve");

  const handleRecordOffer = useCallback(async () => {
    if (!selectedParticipant || !offerAmount) return;

    await onRecordOffer(selectedParticipant.id, {
      amount: Math.round(parseFloat(offerAmount) * 100),
      deliveryDays: deliveryDays ? parseInt(deliveryDays, 10) : undefined,
      paymentTerms: paymentTerms || undefined,
    });

    setShowOfferDialog(false);
    setOfferAmount("");
    setDeliveryDays("");
    setPaymentTerms("");
    setSelectedParticipant(null);
  }, [selectedParticipant, offerAmount, deliveryDays, paymentTerms, onRecordOffer]);

  const handleReject = useCallback(async () => {
    if (!selectedParticipant) return;

    await onReject(selectedParticipant.id, rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason("");
    setSelectedParticipant(null);
  }, [selectedParticipant, rejectionReason, onReject]);

  const handleDragStart = (e: React.DragEvent, participant: TenderParticipant) => {
    e.dataTransfer.setData("participantId", participant.id);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: ParticipantStatus) => {
    e.preventDefault();
    const participantId = e.dataTransfer.getData("participantId");
    if (participantId) {
      await onStatusChange(participantId, newStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const ParticipantCard = ({ participant }: { participant: TenderParticipant }) => (
    <Card
      className="mb-2 cursor-move hover:shadow-md transition-shadow"
      draggable
      onDragStart={(e) => handleDragStart(e, participant)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {participant.supplier.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-sm line-clamp-1">
                {participant.supplier.short_name || participant.supplier.name}
              </div>
              {participant.supplier.inn && (
                <div className="text-xs text-muted-foreground">
                  ИНН: {participant.supplier.inn}
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedParticipant(participant);
                  setShowOfferDialog(true);
                }}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Записать КП
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSetWinner(participant.id)}>
                <Trophy className="h-4 w-4 mr-2" />
                Назначить победителем
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedParticipant(participant);
                  setShowRejectDialog(true);
                }}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Отклонить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Контакты */}
        <div className="flex gap-2 mt-2">
          {participant.supplier.phone && (
            <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
              <a href={`tel:${participant.supplier.phone}`}>
                <Phone className="h-3 w-3" />
              </a>
            </Button>
          )}
          {participant.supplier.email && (
            <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
              <a href={`mailto:${participant.supplier.email}`}>
                <Mail className="h-3 w-3" />
              </a>
            </Button>
          )}
          {participant.supplier.rating && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {participant.supplier.rating}
            </div>
          )}
        </div>

        {/* Предложение */}
        {participant.offer_amount && (
          <div className="mt-2 p-2 bg-accent rounded text-sm">
            <div className="font-medium">
              {formatMoney(participant.offer_amount, "RUB")}
            </div>
            {participant.offer_delivery_days && (
              <div className="text-xs text-muted-foreground">
                Срок: {participant.offer_delivery_days} дн.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Победители */}
      {winners.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <Trophy className="h-4 w-4" />
              Победители ({winners.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2">
              {winners.map((p) => (
                <ParticipantCard key={p.id} participant={p} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((status) => (
          <div
            key={status}
            className="flex-shrink-0 w-64"
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between mb-2">
              <Badge className={PARTICIPANT_STATUSES[status].color}>
                {PARTICIPANT_STATUSES[status].name}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {participantsByStatus[status]?.length || 0}
              </span>
            </div>
            <div className="min-h-[200px] bg-accent/30 rounded-lg p-2">
              {participantsByStatus[status]?.map((p) => (
                <ParticipantCard key={p.id} participant={p} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Резерв и отклонённые */}
      {(reserves.length > 0 || rejected.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {reserves.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Резерв ({reserves.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {reserves.map((p) => (
                  <ParticipantCard key={p.id} participant={p} />
                ))}
              </CardContent>
            </Card>
          )}
          {rejected.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="py-3">
                <CardTitle className="text-base text-red-700">
                  Отклонённые ({rejected.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {rejected.map((p) => (
                  <ParticipantCard key={p.id} participant={p} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Диалог записи КП */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Записать коммерческое предложение</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Сумма предложения (руб.)</Label>
              <Input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div>
              <Label>Срок поставки (дней)</Label>
              <Input
                type="number"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                placeholder="14"
              />
            </div>
            <div>
              <Label>Условия оплаты</Label>
              <Input
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="100% предоплата / 50/50 / отсрочка 30 дней"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleRecordOffer} disabled={!offerAmount}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог отклонения */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить участника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Причина отклонения</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Укажите причину отклонения..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
