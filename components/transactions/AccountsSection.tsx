"use client";

import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/utils/format";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, CreditCard, Wallet, Landmark, Banknote } from "lucide-react";

type Account = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  type: string;
  credit_limit: number | null;
};

type AccountsSectionProps = {
  accounts: Account[];
};

export default function AccountsSection({ accounts }: AccountsSectionProps) {
  // Состояния для сворачивания секций - по умолчанию все развернуты
  const [debitExpanded, setDebitExpanded] = useState(true);
  const [creditExpanded, setCreditExpanded] = useState(true);
  const [loansExpanded, setLoansExpanded] = useState(true);
  const [othersExpanded, setOthersExpanded] = useState(true);

  // Загружаем сохраненное состояние из localStorage после монтирования
  useEffect(() => {
    
    const debitSaved = localStorage.getItem('accounts_debit_expanded');
    if (debitSaved !== null) {
      setDebitExpanded(debitSaved === 'true');
    }
    
    const creditSaved = localStorage.getItem('accounts_credit_expanded');
    if (creditSaved !== null) {
      setCreditExpanded(creditSaved === 'true');
    }
    
    const loansSaved = localStorage.getItem('accounts_loans_expanded');
    if (loansSaved !== null) {
      setLoansExpanded(loansSaved === 'true');
    }
    
    const othersSaved = localStorage.getItem('accounts_others_expanded');
    if (othersSaved !== null) {
      setOthersExpanded(othersSaved === 'true');
    }
  }, []);

  // Разделяем счета на категории
  const debitCards = accounts.filter(
    (a) => a.type === "card" && (!a.credit_limit || a.credit_limit === 0)
  );
  const creditCards = accounts.filter(
    (a) => a.type === "card" && a.credit_limit && a.credit_limit > 0
  );
  const loans = accounts.filter((a) => a.type === "loan");
  const others = accounts.filter(
    (a) => a.type !== "card" && a.type !== "loan"
  );

  // Функции для переключения с сохранением в localStorage
  const toggleDebit = () => {
    const newValue = !debitExpanded;
    setDebitExpanded(newValue);
    localStorage.setItem('accounts_debit_expanded', String(newValue));
  };

  const toggleCredit = () => {
    const newValue = !creditExpanded;
    setCreditExpanded(newValue);
    localStorage.setItem('accounts_credit_expanded', String(newValue));
  };

  const toggleLoans = () => {
    const newValue = !loansExpanded;
    setLoansExpanded(newValue);
    localStorage.setItem('accounts_loans_expanded', String(newValue));
  };

  const toggleOthers = () => {
    const newValue = !othersExpanded;
    setOthersExpanded(newValue);
    localStorage.setItem('accounts_others_expanded', String(newValue));
  };

  const renderAccountCard = (a: Account) => {
    const currentBalance = a.balance ?? 0;
    const isCreditCard = a.type === "card" && a.credit_limit && a.credit_limit > 0;
    const Icon = a.type === "loan" ? Landmark : isCreditCard ? CreditCard : a.type === "cash" ? Banknote : Wallet;

    return (
      <Card key={a.id} className="min-w-[140px]">
        <CardContent className="pt-3 pb-3 px-3">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm font-medium truncate">{a.name}</div>
          <div className={`text-lg font-bold ${currentBalance < 0 ? "text-red-600" : ""}`}>
            {formatMoney(currentBalance, a.currency)}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSection = (title: string, items: Account[], expanded: boolean, toggle: () => void) => {
    if (items.length === 0) return null;
    return (
      <Collapsible open={expanded} onOpenChange={toggle}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted/50 px-2 rounded">
          <span>{title}</span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1">
            {items.map(renderAccountCard)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-2">
      {renderSection("💳 Дебетовые карты", debitCards, debitExpanded, toggleDebit)}
      {renderSection("💳 Кредитные карты", creditCards, creditExpanded, toggleCredit)}
      {renderSection("💰 Кредиты", loans, loansExpanded, toggleLoans)}
      {renderSection("🏦 Другие счета", others, othersExpanded, toggleOthers)}
    </div>
  );
}
