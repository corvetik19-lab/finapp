"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FileText,
  MoreHorizontal,
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
} from "lucide-react";
import {
  SupplierContract,
  ContractType,
  ContractStatus,
  PaymentTerms,
  CONTRACT_TYPES,
  CONTRACT_STATUSES,
  PAYMENT_TERMS,
} from "@/lib/suppliers/types";
import {
  createContract,
  updateContractStatus,
  deleteContract,
} from "@/lib/suppliers/contracts-service";
import { useRouter } from "next/navigation";

interface SupplierContractsProps {
  supplierId: string;
  contracts: SupplierContract[];
}

export function SupplierContracts({ supplierId, contracts }: SupplierContractsProps) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [contractNumber, setContractNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contractType, setContractType] = useState<ContractType>("supply");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");

  const activeContracts = contracts.filter((c) => c.status === "active");
  const otherContracts = contracts.filter((c) => c.status !== "active");

  const resetForm = () => {
    setContractNumber("");
    setTitle("");
    setDescription("");
    setContractType("supply");
    setPaymentTerms("");
    setStartDate("");
    setEndDate("");
    setAmount("");
  };

  const handleCreate = async () => {
    if (!contractNumber.trim() || !title.trim()) return;
    
    setLoading(true);
    try {
      const result = await createContract({
        supplier_id: supplierId,
        contract_number: contractNumber.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        contract_type: contractType,
        payment_terms: paymentTerms || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        amount: amount ? Math.round(parseFloat(amount) * 100) : undefined,
      });
      
      if (result.success) {
        resetForm();
        setFormOpen(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (contractId: string, status: ContractStatus) => {
    await updateContractStatus(contractId, status);
    router.refresh();
  };

  const handleDelete = async (contractId: string) => {
    if (!confirm("Удалить договор?")) return;
    await deleteContract(contractId);
    router.refresh();
  };

  const isExpiringSoon = (contract: SupplierContract) => {
    if (!contract.end_date || contract.status !== "active") return false;
    const daysUntilEnd = Math.ceil(
      (new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilEnd <= (contract.reminder_days || 30) && daysUntilEnd > 0;
  };

  const isExpired = (contract: SupplierContract) => {
    if (!contract.end_date) return false;
    return new Date(contract.end_date) < new Date();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: currency || "RUB",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getStatusBadge = (contract: SupplierContract) => {
    const info = CONTRACT_STATUSES[contract.status];
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      gray: "secondary",
      yellow: "outline",
      green: "default",
      red: "destructive",
    };
    
    if (isExpiringSoon(contract)) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Истекает скоро
        </Badge>
      );
    }
    
    if (isExpired(contract) && contract.status === "active") {
      return (
        <Badge variant="destructive">
          Просрочен
        </Badge>
      );
    }
    
    return (
      <Badge variant={variants[info.color] || "secondary"}>
        {info.name}
      </Badge>
    );
  };

  const renderContract = (contract: SupplierContract) => {
    const expiring = isExpiringSoon(contract);
    const expired = isExpired(contract) && contract.status === "active";
    
    return (
      <div
        key={contract.id}
        className={`p-4 rounded-lg border ${
          expired ? "border-red-200 bg-red-50" :
          expiring ? "border-orange-200 bg-orange-50" :
          "border-gray-100 hover:bg-gray-50"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{contract.title}</span>
              {getStatusBadge(contract)}
            </div>
            
            <div className="text-sm text-gray-500 mb-2">
              № {contract.contract_number}
              {contract.contract_type && (
                <span className="ml-2">• {CONTRACT_TYPES[contract.contract_type]}</span>
              )}
            </div>
            
            {contract.description && (
              <p className="text-sm text-gray-600 mb-2">{contract.description}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
              {contract.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  с {formatDate(contract.start_date)}
                </span>
              )}
              {contract.end_date && (
                <span className={`flex items-center gap-1 ${expired ? "text-red-500" : expiring ? "text-orange-500" : ""}`}>
                  <Clock className="h-3 w-3" />
                  до {formatDate(contract.end_date)}
                </span>
              )}
              {contract.payment_terms && (
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {PAYMENT_TERMS[contract.payment_terms]}
                </span>
              )}
              {contract.amount && (
                <span className="font-medium text-gray-600">
                  {formatAmount(contract.amount, contract.currency)}
                </span>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {contract.status === "draft" && (
                <DropdownMenuItem onClick={() => handleStatusChange(contract.id, "active")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Активировать
                </DropdownMenuItem>
              )}
              {contract.status === "active" && (
                <DropdownMenuItem onClick={() => handleStatusChange(contract.id, "terminated")}>
                  Расторгнуть
                </DropdownMenuItem>
              )}
              {(expired || contract.status === "active") && (
                <DropdownMenuItem onClick={() => handleStatusChange(contract.id, "expired")}>
                  Отметить истёкшим
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleDelete(contract.id)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Договоры</h3>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить
        </Button>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет договоров</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activeContracts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500">Действующие</h4>
              {activeContracts.map(renderContract)}
            </div>
          )}
          
          {otherContracts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500">Архив</h4>
              <div className="opacity-60">
                {otherContracts.map(renderContract)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Форма создания */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новый договор</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Номер договора *</label>
                <Input
                  placeholder="№ 123/2024"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Тип</label>
                <Select value={contractType} onValueChange={(v) => setContractType(v as ContractType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRACT_TYPES).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Название *</label>
              <Input
                placeholder="Договор поставки оборудования"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Описание</label>
              <Textarea
                placeholder="Описание договора..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Дата начала</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Дата окончания</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Условия оплаты</label>
                <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v as PaymentTerms)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_TERMS).map(([key, name]) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Сумма договора</label>
                <Input
                  type="number"
                  placeholder="100000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={loading || !contractNumber.trim() || !title.trim()}
            >
              {loading ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
