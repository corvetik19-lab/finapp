"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneIncoming,
  X,
  Building2,
  User,
  ExternalLink,
  StickyNote,
} from "lucide-react";

interface SupplierInfo {
  id: string;
  name: string;
  short_name?: string;
  category?: {
    name: string;
    color: string;
  };
}

interface ContactInfo {
  id: string;
  name: string;
  position?: string;
}

interface IncomingCallData {
  phone: string;
  supplier: SupplierInfo | null;
  contact: ContactInfo | null;
}

interface IncomingCallPopupProps {
  call: IncomingCallData | null;
  onClose: () => void;
  onAddNote?: (supplierId: string) => void;
}

export function IncomingCallPopup({
  call,
  onClose,
  onAddNote,
}: IncomingCallPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (call) {
      setIsVisible(true);
      // Воспроизводим звук уведомления
      try {
        const audio = new Audio("/sounds/ring.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {
        // Игнорируем ошибки воспроизведения
      }

      // Показываем браузерное уведомление
      if (Notification.permission === "granted") {
        const title = call.supplier?.name || "Входящий звонок";
        const body = call.contact
          ? `${call.contact.name}${call.contact.position ? ` (${call.contact.position})` : ""}`
          : call.phone;

        new Notification(title, {
          body,
          icon: "/icons/phone-incoming.png",
          tag: "incoming-call",
        });
      }
    } else {
      setIsVisible(false);
    }
  }, [call]);

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
      return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
    }
    return phone;
  };

  if (!call || !isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
      <Card className="w-80 shadow-lg border-2 border-green-500">
        <CardContent className="p-4">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-green-600">
              <div className="p-1.5 bg-green-100 rounded-full animate-pulse">
                <PhoneIncoming className="h-4 w-4" />
              </div>
              <span className="font-medium text-sm">Входящий звонок</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Информация о звонящем */}
          {call.supplier ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{call.supplier.name}</p>
                  {call.supplier.category && (
                    <Badge
                      variant="outline"
                      className="text-xs mt-1"
                      style={{ borderColor: call.supplier.category.color }}
                    >
                      {call.supplier.category.name}
                    </Badge>
                  )}
                </div>
              </div>

              {call.contact && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {call.contact.name}
                    {call.contact.position && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({call.contact.position})
                      </span>
                    )}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{formatPhone(call.phone)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">{formatPhone(call.phone)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Неизвестный номер
              </p>
            </div>
          )}

          {/* Действия */}
          <div className="flex gap-2 mt-4">
            {call.supplier && (
              <>
                <Button size="sm" variant="outline" className="flex-1" asChild>
                  <Link href={`/tenders/suppliers/${call.supplier.id}`}>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Открыть
                  </Link>
                </Button>
                {onAddNote && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddNote(call.supplier!.id)}
                  >
                    <StickyNote className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
