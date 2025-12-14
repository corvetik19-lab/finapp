"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Percent,
  Users,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";

function formatMoney(kopecks: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

interface Usn6Data {
  income: number;
  taxBase: number;
  taxCalculated: number;
  insuranceDeduction: number;
  taxToPay: number;
  effectiveRate: number;
  quarters: {
    quarter: number;
    income: number;
    taxCalculated: number;
    insuranceDeduction: number;
    advancePayment: number;
    paidAdvances: number;
  }[];
}

interface Usn15Data {
  income: number;
  expenses: number;
  taxBase: number;
  taxCalculated: number;
  minTax: number;
  taxToPay: number;
  isMinTax: boolean;
  effectiveRate: number;
  quarters: {
    quarter: number;
    income: number;
    expenses: number;
    taxBase: number;
    taxCalculated: number;
    advancePayment: number;
    paidAdvances: number;
  }[];
}

interface VatData {
  outputVat: number;
  inputVat: number;
  vatToPay: number;
  vatToRefund: number;
}

interface IpInsuranceData {
  fixedContributions: number;
  excessContributions: number;
  totalContributions: number;
  income: number;
  excessIncome: number;
}

export function TaxCalculatorsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [hasEmployees, setHasEmployees] = useState(false);
  const [loading, setLoading] = useState(false);

  // Данные калькуляторов
  const [usn6Data, setUsn6Data] = useState<Usn6Data | null>(null);
  const [usn15Data, setUsn15Data] = useState<Usn15Data | null>(null);
  const [vatData, setVatData] = useState<VatData | null>(null);
  const [ipInsuranceData, setIpInsuranceData] = useState<IpInsuranceData | null>(null);

  // Сотрудники для расчёта взносов
  const [employees, setEmployees] = useState<{ name: string; salary: number }[]>([
    { name: "Сотрудник 1", salary: 5000000 },
  ]);
  const [employeeInsurance, setEmployeeInsurance] = useState<{
    employees: { name: string; salary: number; totalContribution: number }[];
    monthlyTotal: number;
  } | null>(null);

  async function loadCalculation(type: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        year: year.toString(),
        quarter: quarter.toString(),
        hasEmployees: hasEmployees.toString(),
      });

      const res = await fetch(`/api/accounting/tax-calculator?${params}`);
      if (res.ok) {
        const data = await res.json();
        switch (type) {
          case "usn6":
            setUsn6Data(data);
            break;
          case "usn15":
            setUsn15Data(data);
            break;
          case "vat":
            setVatData(data);
            break;
          case "ip-insurance":
            setIpInsuranceData(data);
            break;
        }
      }
    } catch (error) {
      console.error("Error loading calculation:", error);
    } finally {
      setLoading(false);
    }
  }

  async function calculateEmployeeInsurance() {
    setLoading(true);
    try {
      const res = await fetch("/api/accounting/tax-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "employee-insurance",
          salaries: employees,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmployeeInsurance(data);
      }
    } catch (error) {
      console.error("Error calculating employee insurance:", error);
    } finally {
      setLoading(false);
    }
  }

  function addEmployee() {
    setEmployees([...employees, { name: `Сотрудник ${employees.length + 1}`, salary: 5000000 }]);
  }

  function removeEmployee(index: number) {
    setEmployees(employees.filter((_, i) => i !== index));
  }

  function updateEmployee(index: number, field: "name" | "salary", value: string | number) {
    const updated = [...employees];
    if (field === "salary") {
      updated[index].salary = typeof value === "string" ? parseInt(value) * 100 : value;
    } else {
      updated[index].name = value as string;
    }
    setEmployees(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-primary" />
            Калькуляторы налогов
          </h1>
          <p className="text-muted-foreground">Расчёт налогов и взносов</p>
        </div>
      </div>

      {/* Фильтры */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Год</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Квартал (для НДС)</Label>
              <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(q => (
                    <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={hasEmployees}
                onCheckedChange={setHasEmployees}
                id="hasEmployees"
              />
              <Label htmlFor="hasEmployees">Есть сотрудники</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Вкладки калькуляторов */}
      <Tabs defaultValue="usn6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="usn6">УСН 6%</TabsTrigger>
          <TabsTrigger value="usn15">УСН 15%</TabsTrigger>
          <TabsTrigger value="vat">НДС</TabsTrigger>
          <TabsTrigger value="ip-insurance">Взносы ИП</TabsTrigger>
          <TabsTrigger value="employee-insurance">Взносы за сотр.</TabsTrigger>
        </TabsList>

        {/* УСН 6% */}
        <TabsContent value="usn6" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => loadCalculation("usn6")} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Рассчитать
            </Button>
          </div>

          {usn6Data ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Доходы
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(usn6Data.income)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Налог (6%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(usn6Data.taxCalculated)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-blue-500" />
                      Вычет взносов
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      −{formatMoney(usn6Data.insuranceDeduction)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">К уплате</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatMoney(usn6Data.taxToPay)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Эфф. ставка: {usn6Data.effectiveRate.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Расчёт по кварталам</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Квартал</TableHead>
                        <TableHead className="text-right">Доход (нараст.)</TableHead>
                        <TableHead className="text-right">Налог</TableHead>
                        <TableHead className="text-right">Вычет</TableHead>
                        <TableHead className="text-right">Уплачено</TableHead>
                        <TableHead className="text-right">К уплате</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usn6Data.quarters.map(q => (
                        <TableRow key={q.quarter}>
                          <TableCell>Q{q.quarter}</TableCell>
                          <TableCell className="text-right">{formatMoney(q.income)}</TableCell>
                          <TableCell className="text-right">{formatMoney(q.taxCalculated)}</TableCell>
                          <TableCell className="text-right text-blue-600">−{formatMoney(q.insuranceDeduction)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatMoney(q.paidAdvances)}</TableCell>
                          <TableCell className="text-right font-medium">{formatMoney(q.advancePayment)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нажмите «Рассчитать» для расчёта УСН 6%</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* УСН 15% */}
        <TabsContent value="usn15" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => loadCalculation("usn15")} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Рассчитать
            </Button>
          </div>

          {usn15Data ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Доходы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatMoney(usn15Data.income)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Расходы</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatMoney(usn15Data.expenses)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">База (Д−Р)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(usn15Data.taxBase)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">К уплате</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatMoney(usn15Data.taxToPay)}
                    </div>
                    {usn15Data.isMinTax && (
                      <Badge variant="destructive" className="mt-1">Мин. налог 1%</Badge>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Расчёт по кварталам</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Квартал</TableHead>
                        <TableHead className="text-right">Доход</TableHead>
                        <TableHead className="text-right">Расход</TableHead>
                        <TableHead className="text-right">База</TableHead>
                        <TableHead className="text-right">Налог</TableHead>
                        <TableHead className="text-right">К уплате</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usn15Data.quarters.map(q => (
                        <TableRow key={q.quarter}>
                          <TableCell>Q{q.quarter}</TableCell>
                          <TableCell className="text-right text-green-600">{formatMoney(q.income)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatMoney(q.expenses)}</TableCell>
                          <TableCell className="text-right">{formatMoney(q.taxBase)}</TableCell>
                          <TableCell className="text-right">{formatMoney(q.taxCalculated)}</TableCell>
                          <TableCell className="text-right font-medium">{formatMoney(q.advancePayment)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нажмите «Рассчитать» для расчёта УСН 15%</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* НДС */}
        <TabsContent value="vat" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => loadCalculation("vat")} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Рассчитать за Q{quarter}
            </Button>
          </div>

          {vatData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Исходящий НДС
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatMoney(vatData.outputVat)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Входящий НДС
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatMoney(vatData.inputVat)}</div>
                </CardContent>
              </Card>
              <Card className={vatData.vatToPay > 0 ? "bg-red-50 border-red-200" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    К уплате
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatMoney(vatData.vatToPay)}</div>
                </CardContent>
              </Card>
              <Card className={vatData.vatToRefund > 0 ? "bg-green-50 border-green-200" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    К возмещению
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatMoney(vatData.vatToRefund)}</div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нажмите «Рассчитать» для расчёта НДС</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Взносы ИП */}
        <TabsContent value="ip-insurance" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => loadCalculation("ip-insurance")} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Рассчитать
            </Button>
          </div>

          {ipInsuranceData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Доход за год</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(ipInsuranceData.income)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Фиксированные</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(ipInsuranceData.fixedContributions)}</div>
                    <p className="text-xs text-muted-foreground">До 31 декабря</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">1% с превышения</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMoney(ipInsuranceData.excessContributions)}</div>
                    <p className="text-xs text-muted-foreground">
                      {ipInsuranceData.excessIncome > 0 
                        ? `С ${formatMoney(ipInsuranceData.excessIncome)}`
                        : "Нет превышения"
                      }
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Итого взносов</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {formatMoney(ipInsuranceData.totalContributions)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Сроки уплаты</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">Фиксированные взносы</p>
                        <p className="text-sm text-muted-foreground">До 31 декабря {year}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatMoney(ipInsuranceData.fixedContributions)}</p>
                      </div>
                    </div>
                    {ipInsuranceData.excessContributions > 0 && (
                      <div className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">1% с дохода свыше 300 000 ₽</p>
                          <p className="text-sm text-muted-foreground">До 1 июля {year + 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatMoney(ipInsuranceData.excessContributions)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Нажмите «Рассчитать» для расчёта страховых взносов ИП</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Взносы за сотрудников */}
        <TabsContent value="employee-insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Сотрудники</span>
                <Button size="sm" variant="outline" onClick={addEmployee}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employees.map((emp, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <Input
                      placeholder="Имя"
                      value={emp.name}
                      onChange={(e) => updateEmployee(idx, "name", e.target.value)}
                      className="w-48"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Зарплата"
                        value={Math.round(emp.salary / 100)}
                        onChange={(e) => updateEmployee(idx, "salary", e.target.value)}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">₽</span>
                    </div>
                    {employees.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmployee(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button className="mt-4" onClick={calculateEmployeeInsurance} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Рассчитать взносы
              </Button>
            </CardContent>
          </Card>

          {employeeInsurance && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Результат расчёта</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Сотрудник</TableHead>
                      <TableHead className="text-right">Зарплата</TableHead>
                      <TableHead className="text-right">Взносы</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeInsurance.employees.map((emp, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell className="text-right">{formatMoney(emp.salary)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(emp.totalContribution)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Итого в месяц</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatMoney(employeeInsurance.monthlyTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
