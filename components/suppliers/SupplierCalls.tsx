"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
} from "lucide-react";
import {
  CallHistory,
  CallDirection,
  CALL_STATUSES,
  formatPhoneNumber,
  formatDuration,
} from "@/lib/suppliers/types";

interface SupplierCallsProps {
  supplierId: string;
  calls: CallHistory[];
}

export function SupplierCalls({ calls }: SupplierCallsProps) {
  const getDirectionIcon = (direction: CallDirection) => {
    return direction === "inbound" ? (
      <PhoneIncoming className="h-4 w-4 text-green-600" />
    ) : (
      <PhoneOutgoing className="h-4 w-4 text-blue-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    const info = CALL_STATUSES[status as keyof typeof CALL_STATUSES];
    if (!info) return <Badge variant="secondary">{status}</Badge>;
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      green: "default",
      red: "destructive",
      blue: "outline",
      orange: "secondary",
      gray: "secondary",
    };
    return <Badge variant={variants[info.color] || "secondary"}>{info.name}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">История звонков</h3>
      </div>

      {calls.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Нет звонков</p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getDirectionIcon(call.direction)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {formatPhoneNumber(
                        call.direction === "inbound"
                          ? call.from_number
                          : call.to_number
                      )}
                    </span>
                    {getStatusBadge(call.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>
                      {new Date(call.started_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {call.talk_duration > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(call.talk_duration)}</span>
                      </>
                    )}
                    {call.contact && (
                      <>
                        <span>•</span>
                        <span>{call.contact.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {call.recording_url && (
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
