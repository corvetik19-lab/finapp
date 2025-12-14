"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Eye,
  Loader2,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/toast/ToastContext";
import {
  createCashOrder,
  prepareCashOrder,
  updateCashOrder,
  type CashOrder,
  type CashOrderType,
} from "@/lib/accounting/documents/cash-orders";
import type { AccountingCounterparty } from "@/lib/accounting/types";

interface CashOrdersPageProps {
  orders: CashOrder[];
  counterparties: AccountingCounterparty[];
  cashBalance: { balance: number; lastDate?: string };
}

function formatMoney(kopeks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
  }).format(kopeks / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU");
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Черновик", variant: "outline" },
    signed: { label: "Подписан", variant: "default" },
    cancelled: { label: "Аннулирован", variant: "destructive" },
  };
  const info = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={info.variant}>{info.label}</Badge>;
}

export function CashOrdersPage({ orders, counterparties, cashBalance }: CashOrdersPageProps) {
  const { show } = useToast();
  const [activeTab, setActiveTab] = useState<"all" | "pko" | "rko">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<CashOrderType>("pko");
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CashOrder>>({});

  const filteredOrders = activeTab === "all" 
    ? orders 
    : orders.filter(o => o.order_type === activeTab);

  const handleOpenCreate = async (type: CashOrderType) => {
    setCreateType(type);
    setLoading(true);
    try {
      const prepared = await prepareCashOrder(type);
      if (prepared) {
        setFormData(prepared);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setIsCreateOpen(true);
    }
  };

  const handleCreate = async () => {
    if (!formData.counterparty_name || !formData.basis || !formData.amount) {
      show("Заполните обязательные поля", { type: "error" });
      return;
    }
    
    setLoading(true);
    try {
      const result = await createCashOrder(formData as Omit<CashOrder, "id" | "company_id" | "created_at">);
      
      if (result.success) {
        show(`${createType === "pko" ? "ПКО" : "РКО"} создан`, { type: "success" });
        setIsCreateOpen(false);
        window.location.reload();
      } else {
        show(result.error || "Ошибка создания", { type: "error" });
      }
    } catch (error) {
      show("Ошибка при создании", { type: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: CashOrder["status"]) => {
    const result = await updateCashOrder(id, { status: newStatus });
    if (result.success) {
      show("Статус обновлён", { type: "success" });
      window.location.reload();
    } else {
      show(result.error || "Ошибка", { type: "error" });
    }
  };

  const pkoCount = orders.filter(o => o.order_type === "pko").length;
  const rkoCount = orders.filter(o => o.order_type === "rko").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders/accounting">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-7 w-7 text-primary" />
              Кассовые ордера
            </h1>
            <p className="text-muted-foreground">
              Приходные (ПКО) и расходные (РКО) кассовые ордера
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleOpenCreate("rko")}>
            <ArrowDownRight className="h-4 w-4 mr-2 text-red-600" />
            РКО
          </Button>
          <Button onClick={() => handleOpenCreate("pko")}>
            <ArrowUpRight className="h-4 w-4 mr-2 text-green-600" />
            ПКО
          </Button>
        </div>
      </div>

      {/* Cash Balance */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Остаток в кассе</p>
              <p className={`text-3xl font-bold ${cashBalance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatMoney(cashBalance.balance)}
              </p>
              {cashBalance.lastDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  по состоянию на {formatDate(cashBalance.lastDate)}
                </p>
              )}
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <div className="flex items-center gap-2 text-green-600">
                  <ArrowUpRight className="h-5 w-5" />
                  <span className="text-2xl font-bold">{pkoCount}</span>
                </div>
                <p className="text-xs text-muted-foreground">ПКО</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-2 text-red-600">
                  <ArrowDownRight className="h-5 w-5" />
                  <span className="text-2xl font-bold">{rkoCount}</span>
                </div>
                <p className="text-xs text-muted-foreground">РКО</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {createType === "pko" ? (
                <>
                  <ArrowUpRight className="h-5 w-5 text-green-600" />
                  Приходный кассовый ордер (ПКО)
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-5 w-5 text-red-600" />
                  Расходный кассовый ордер (РКО)
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {createType === "pko" ? "Оформление прихода денежных средств в кассу" : "Оформление выдачи денежных средств из кассы"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Номер и дата */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Номер</Label>
                <Input
                  value={formData.number || ""}
                  onChange={e => setFormData({ ...formData, number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Дата</Label>
                <Input
                  type="date"
                  value={formData.order_date || ""}
                  onChange={e => setFormData({ ...formData, order_date: e.target.value })}
                />
              </div>
            </div>

            {/* Сумма */}
            <div className="space-y-2">
              <Label>Сумма (₽) *</Label>
              <Input
                type="text"
                value={formData.amount ? (formData.amount / 100).toFixed(2) : ""}
                onChange={e => {
                  const val = parseFloat(e.target.value.replace(",", ".")) || 0;
                  setFormData({ ...formData, amount: Math.round(val * 100) });
                }}
                placeholder="0.00"
              />
            </div>

            {/* Контрагент */}
            <div className="space-y-2">
              <Label>{createType === "pko" ? "Принято от" : "Выдать"} *</Label>
              <Select
                value=""
                onValueChange={v => {
                  const cp = counterparties.find(c => c.id === v);
                  if (cp) {
                    setFormData({
                      ...formData,
                      counterparty_name: cp.name,
                      counterparty_inn: cp.inn || undefined,
                      counterparty_id: cp.id,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите из справочника" />
                </SelectTrigger>
                <SelectContent>
                  {counterparties.map(cp => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.short_name || cp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={formData.counterparty_name || ""}
                onChange={e => setFormData({ ...formData, counterparty_name: e.target.value })}
                placeholder="Или введите вручную"
              />
            </div>

            {/* Основание */}
            <div className="space-y-2">
              <Label>Основание *</Label>
              <Textarea
                value={formData.basis || ""}
                onChange={e => setFormData({ ...formData, basis: e.target.value })}
                placeholder={createType === "pko" 
                  ? "Оплата по счёту №... от..." 
                  : "Выдача под отчёт / Оплата поставщику..."}
                rows={2}
              />
            </div>

            {/* Приложение */}
            <div className="space-y-2">
              <Label>Приложение</Label>
              <Input
                value={formData.attachment || ""}
                onChange={e => setFormData({ ...formData, attachment: e.target.value })}
                placeholder="Счёт №... от..."
              />
            </div>

            {/* Паспорт (для РКО) */}
            {createType === "rko" && (
              <div className="space-y-2">
                <Label>Паспортные данные</Label>
                <Input
                  value={formData.passport_data || ""}
                  onChange={e => setFormData({ ...formData, passport_data: e.target.value })}
                  placeholder="Серия, номер, кем и когда выдан"
                />
              </div>
            )}

            <Button onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Создать {createType === "pko" ? "ПКО" : "РКО"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* List */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="all">Все ({orders.length})</TabsTrigger>
              <TabsTrigger value="pko">ПКО ({pkoCount})</TabsTrigger>
              <TabsTrigger value="rko">РКО ({rkoCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>№</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>{activeTab === "rko" ? "Кому" : activeTab === "pko" ? "От кого" : "Контрагент"}</TableHead>
                  <TableHead>Основание</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {order.order_type === "pko" ? (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          ПКО
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          РКО
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{order.number}</TableCell>
                    <TableCell>{formatDate(order.order_date)}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-[150px]">{order.counterparty_name}</p>
                    </TableCell>
                    <TableCell>
                      <p className="truncate max-w-[200px] text-sm text-muted-foreground">{order.basis}</p>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${order.order_type === "pko" ? 'text-green-600' : 'text-red-600'}`}>
                      {order.order_type === "pko" ? "+" : "−"}{formatMoney(order.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        {order.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(order.id!, "signed")}
                            title="Подписать"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {order.status === "signed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStatusChange(order.id!, "cancelled")}
                            title="Аннулировать"
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет кассовых ордеров</p>
              <p className="text-sm mt-2">
                Создайте ПКО или РКО для учёта кассовых операций
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
