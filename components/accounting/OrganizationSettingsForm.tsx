"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  FileText,
  CreditCard,
  Calculator,
  Save,
  Loader2,
  Search,
} from "lucide-react";
import type {
  OrganizationSettings,
  OrganizationType,
  TaxSystem,
} from "@/lib/accounting/settings-types";
import {
  ORGANIZATION_TYPES,
  TAX_SYSTEMS,
  VAT_RATES,
} from "@/lib/accounting/settings-types";

interface OrganizationSettingsFormProps {
  initialSettings?: OrganizationSettings | null;
  onSave?: () => void;
}

export function OrganizationSettingsForm({
  initialSettings,
  onSave,
}: OrganizationSettingsFormProps) {
  const [saving, setSaving] = useState(false);
  const [searchingInn, setSearchingInn] = useState(false);
  const [activeTab, setActiveTab] = useState("organization");

  // Основные данные
  const [organizationType, setOrganizationType] = useState<OrganizationType>(
    initialSettings?.organizationType || "ip"
  );
  const [organizationName, setOrganizationName] = useState(
    initialSettings?.organizationName || ""
  );
  const [shortName, setShortName] = useState(initialSettings?.shortName || "");

  // Реквизиты
  const [inn, setInn] = useState(initialSettings?.inn || "");
  const [kpp, setKpp] = useState(initialSettings?.kpp || "");
  const [ogrn, setOgrn] = useState(initialSettings?.ogrn || "");
  const [okpo] = useState(initialSettings?.okpo || "");
  const [okved] = useState(initialSettings?.okved || "");

  // Адреса
  const [legalAddress, setLegalAddress] = useState(
    initialSettings?.legalAddress || ""
  );
  const [actualAddress, setActualAddress] = useState(
    initialSettings?.actualAddress || ""
  );

  // Контакты
  const [phone, setPhone] = useState(initialSettings?.phone || "");
  const [email, setEmail] = useState(initialSettings?.email || "");
  const [website, setWebsite] = useState(initialSettings?.website || "");

  // Руководство
  const [directorName, setDirectorName] = useState(
    initialSettings?.directorName || ""
  );
  const [directorPosition, setDirectorPosition] = useState(
    initialSettings?.directorPosition || "Директор"
  );
  const [accountantName] = useState(
    initialSettings?.accountantName || ""
  );

  // Налогообложение
  const [taxSystem, setTaxSystem] = useState<TaxSystem>(
    initialSettings?.taxSystem || "usn_income"
  );
  const [usnRate, setUsnRate] = useState(initialSettings?.usnRate || 6);
  const [isVatPayer, setIsVatPayer] = useState(
    initialSettings?.isVatPayer || false
  );
  const [vatRate, setVatRate] = useState(initialSettings?.vatRate || 20);

  // Банковские реквизиты
  const [bankName, setBankName] = useState(initialSettings?.bankName || "");
  const [bik, setBik] = useState(initialSettings?.bik || "");
  const [checkingAccount, setCheckingAccount] = useState(
    initialSettings?.checkingAccount || ""
  );
  const [correspondentAccount, setCorrespondentAccount] = useState(
    initialSettings?.correspondentAccount || ""
  );

  // Нумерация
  const [invoicePrefix, setInvoicePrefix] = useState(
    initialSettings?.invoicePrefix || "СЧ"
  );
  const [actPrefix, setActPrefix] = useState(
    initialSettings?.actPrefix || "АКТ"
  );
  const [contractPrefix, setContractPrefix] = useState(
    initialSettings?.contractPrefix || "ДОГ"
  );

  // Обновить ставку УСН при смене системы
  useEffect(() => {
    if (taxSystem === "usn_income") {
      setUsnRate(6);
    } else if (taxSystem === "usn_income_expense") {
      setUsnRate(15);
    }
  }, [taxSystem]);

  // Поиск по ИНН
  const handleSearchByInn = async () => {
    if (!inn || inn.length < 10) return;

    setSearchingInn(true);
    try {
      const res = await fetch(
        `/api/accounting/counterparties?action=searchInn&inn=${inn}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.name) setOrganizationName(data.name);
        if (data.shortName) setShortName(data.shortName);
        if (data.kpp) setKpp(data.kpp);
        if (data.ogrn) setOgrn(data.ogrn);
        if (data.address) setLegalAddress(data.address);
        if (data.managementName) setDirectorName(data.managementName);
      }
    } catch (error) {
      console.error("Error searching by INN:", error);
    } finally {
      setSearchingInn(false);
    }
  };

  // Сохранить настройки
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/accounting/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationType,
          organizationName,
          shortName,
          inn,
          kpp,
          ogrn,
          okpo,
          okved,
          legalAddress,
          actualAddress,
          phone,
          email,
          website,
          directorName,
          directorPosition,
          accountantName,
          taxSystem,
          usnRate,
          isVatPayer,
          vatRate,
          bankName,
          bik,
          checkingAccount,
          correspondentAccount,
          invoicePrefix,
          actPrefix,
          contractPrefix,
        }),
      });

      if (res.ok) {
        onSave?.();
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Настройки организации
          </h1>
          <p className="text-muted-foreground">
            Реквизиты и параметры для бухгалтерии
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Сохранить
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Организация
          </TabsTrigger>
          <TabsTrigger value="tax" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Налоги
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Банк
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Документы
          </TabsTrigger>
        </TabsList>

        {/* Организация */}
        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Основные данные</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип организации</Label>
                  <Select
                    value={organizationType}
                    onValueChange={(v) => setOrganizationType(v as OrganizationType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORGANIZATION_TYPES).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ИНН</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inn}
                      onChange={(e) => setInn(e.target.value)}
                      placeholder={organizationType === "ip" ? "12 цифр" : "10 цифр"}
                      maxLength={12}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSearchByInn}
                      disabled={searchingInn || inn.length < 10}
                    >
                      {searchingInn ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Полное наименование</Label>
                <Input
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="ООО 'Компания' или ИП Иванов Иван Иванович"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Краткое наименование</Label>
                  <Input
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="ООО 'Компания'"
                  />
                </div>
                <div className="space-y-2">
                  <Label>КПП</Label>
                  <Input
                    value={kpp}
                    onChange={(e) => setKpp(e.target.value)}
                    placeholder="9 цифр"
                    maxLength={9}
                    disabled={organizationType === "ip"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ОГРН{organizationType === "ip" ? "ИП" : ""}</Label>
                  <Input
                    value={ogrn}
                    onChange={(e) => setOgrn(e.target.value)}
                    placeholder={organizationType === "ip" ? "15 цифр" : "13 цифр"}
                    maxLength={15}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Адреса</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Юридический адрес</Label>
                <Textarea
                  value={legalAddress}
                  onChange={(e) => setLegalAddress(e.target.value)}
                  placeholder="Индекс, город, улица, дом, офис"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Фактический адрес</Label>
                <Textarea
                  value={actualAddress}
                  onChange={(e) => setActualAddress(e.target.value)}
                  placeholder="Если отличается от юридического"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Руководство и контакты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ФИО руководителя</Label>
                  <Input
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Должность</Label>
                  <Input
                    value={directorPosition}
                    onChange={(e) => setDirectorPosition(e.target.value)}
                    placeholder="Директор"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@company.ru"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Сайт</Label>
                  <Input
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.ru"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Налоги */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Система налогообложения</CardTitle>
              <CardDescription>
                Выберите применяемую систему налогообложения
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Система налогообложения</Label>
                <Select
                  value={taxSystem}
                  onValueChange={(v) => setTaxSystem(v as TaxSystem)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TAX_SYSTEMS).map(([key, { name, description }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{name}</span>
                          <span className="text-xs text-muted-foreground">
                            {description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(taxSystem === "usn_income" || taxSystem === "usn_income_expense") && (
                <div className="space-y-2">
                  <Label>Ставка УСН, %</Label>
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    value={usnRate}
                    onChange={(e) => setUsnRate(parseInt(e.target.value) || 6)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {taxSystem === "usn_income"
                      ? "Стандартная ставка 6%, может быть снижена регионом"
                      : "Стандартная ставка 15%, может быть снижена регионом"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">НДС</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Плательщик НДС</Label>
                  <p className="text-sm text-muted-foreground">
                    Включите, если организация является плательщиком НДС
                  </p>
                </div>
                <Switch checked={isVatPayer} onCheckedChange={setIsVatPayer} />
              </div>

              {isVatPayer && (
                <div className="space-y-2">
                  <Label>Ставка НДС по умолчанию</Label>
                  <Select
                    value={String(vatRate)}
                    onValueChange={(v) => setVatRate(parseInt(v))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VAT_RATES.map((r) => (
                        <SelectItem key={r.value} value={String(r.value)}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Банк */}
        <TabsContent value="bank" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Банковские реквизиты</CardTitle>
              <CardDescription>
                Реквизиты для формирования счетов и платёжных документов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Наименование банка</Label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="АО 'Тинькофф Банк'"
                  />
                </div>
                <div className="space-y-2">
                  <Label>БИК</Label>
                  <Input
                    value={bik}
                    onChange={(e) => setBik(e.target.value)}
                    placeholder="9 цифр"
                    maxLength={9}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Расчётный счёт</Label>
                  <Input
                    value={checkingAccount}
                    onChange={(e) => setCheckingAccount(e.target.value)}
                    placeholder="20 цифр"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Корреспондентский счёт</Label>
                  <Input
                    value={correspondentAccount}
                    onChange={(e) => setCorrespondentAccount(e.target.value)}
                    placeholder="20 цифр"
                    maxLength={20}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Документы */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Нумерация документов</CardTitle>
              <CardDescription>
                Префиксы для автоматической нумерации документов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Префикс счетов</Label>
                  <Input
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="СЧ"
                  />
                  <p className="text-xs text-muted-foreground">
                    Пример: {invoicePrefix}2024-001
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Префикс актов</Label>
                  <Input
                    value={actPrefix}
                    onChange={(e) => setActPrefix(e.target.value)}
                    placeholder="АКТ"
                  />
                  <p className="text-xs text-muted-foreground">
                    Пример: {actPrefix}2024-001
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Префикс договоров</Label>
                  <Input
                    value={contractPrefix}
                    onChange={(e) => setContractPrefix(e.target.value)}
                    placeholder="ДОГ"
                  />
                  <p className="text-xs text-muted-foreground">
                    Пример: {contractPrefix}2024-001
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
