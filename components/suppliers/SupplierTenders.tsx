"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ExternalLink } from "lucide-react";
import {
  SupplierTender,
  SUPPLIER_TENDER_ROLES,
  SUPPLIER_TENDER_STATUSES,
} from "@/lib/suppliers/types";

interface SupplierTendersProps {
  supplierId: string;
  tenders: SupplierTender[];
}

export function SupplierTenders({ tenders }: SupplierTendersProps) {
  const formatMoney = (kopecks?: number) => {
    if (!kopecks) return "—";
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
    }).format(kopecks / 100);
  };

  const getStatusBadge = (status: string) => {
    const info = SUPPLIER_TENDER_STATUSES[status as keyof typeof SUPPLIER_TENDER_STATUSES];
    if (!info) return <Badge variant="secondary">{status}</Badge>;
    
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      green: "default",
      red: "destructive",
      blue: "outline",
      cyan: "secondary",
      purple: "secondary",
      gray: "secondary",
    };
    return <Badge variant={variants[info.color] || "secondary"}>{info.name}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const info = SUPPLIER_TENDER_ROLES[role as keyof typeof SUPPLIER_TENDER_ROLES];
    if (!info) return null;
    
    return (
      <Badge variant="outline" style={{ borderColor: info.color === "green" ? "#22c55e" : undefined }}>
        {info.name}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Участие в тендерах</h3>
      </div>

      {tenders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Не участвует в тендерах</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((item) => (
            <div
              key={item.id}
              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {item.tender ? (
                    <Link
                      href={`/tenders/${item.tender_id}`}
                      className="group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium group-hover:text-primary">
                          {item.tender.purchase_number}
                        </span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.tender.subject}
                      </p>
                    </Link>
                  ) : (
                    <p className="text-muted-foreground">Тендер не найден</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {getRoleBadge(item.role)}
                    {getStatusBadge(item.status)}
                    {item.proposed_price && (
                      <span className="text-sm">
                        Предложение: {formatMoney(item.proposed_price)}
                      </span>
                    )}
                    {item.final_price && (
                      <span className="text-sm text-green-600">
                        Итого: {formatMoney(item.final_price)}
                      </span>
                    )}
                  </div>
                  
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
