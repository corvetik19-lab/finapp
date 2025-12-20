"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  FileText, 
  Receipt, 
  FileCheck, 
  Truck, 
  CreditCard,
  BookOpen,
  Calculator,
  Users
} from "lucide-react";
import Link from "next/link";

const quickActions = [
  {
    label: "Создать счёт",
    icon: Receipt,
    href: "/tenders/accounting/documents/new?type=invoice",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    label: "Создать акт",
    icon: FileCheck,
    href: "/tenders/accounting/documents/new?type=act",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    label: "Создать УПД",
    icon: FileText,
    href: "/tenders/accounting/documents/new?type=upd",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    label: "Накладная",
    icon: Truck,
    href: "/tenders/accounting/documents/new?type=waybill",
    color: "bg-orange-500 hover:bg-orange-600",
  },
  {
    label: "Запись КУДиР",
    icon: BookOpen,
    href: "/tenders/accounting/kudir/new",
    color: "bg-teal-500 hover:bg-teal-600",
  },
  {
    label: "Платёжка",
    icon: CreditCard,
    href: "/tenders/accounting/bank-accounts?action=payment",
    color: "bg-indigo-500 hover:bg-indigo-600",
  },
  {
    label: "Калькулятор",
    icon: Calculator,
    href: "/tenders/accounting/taxes/calculators",
    color: "bg-amber-500 hover:bg-amber-600",
  },
  {
    label: "Контрагент",
    icon: Users,
    href: "/tenders/accounting/counterparties/new",
    color: "bg-pink-500 hover:bg-pink-600",
  },
];

export function QuickActionsWidget() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Быстрые действия
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                className={`w-full h-auto py-3 flex flex-col items-center gap-1 text-white border-0 ${action.color} transition-all`}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
