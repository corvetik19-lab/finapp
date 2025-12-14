"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";

// Константы для расчётов 2024 года
const TAX_CONSTANTS_2024 = {
  // УСН
  usn6Rate: 6, // %
  usn15Rate: 15, // %
  usn15MinRate: 1, // Минимальный налог 1%
  
  // НДС
  vat20Rate: 20, // %
  vat10Rate: 10, // %
  vat0Rate: 0, // %
  
  // Страховые взносы ИП
  ipFixedPension: 4943700, // 49 437 руб в копейках
  ipFixedMedical: 2940300, // 29 403 руб в копейках (включено в единый платёж)
  ipFixedTotal: 4943700, // Единый платёж с 2024
  ipExcessRate: 1, // 1% с дохода свыше 300 000
  ipExcessThreshold: 30000000, // 300 000 руб в копейках
  ipMaxPension: 27747800, // Максимум пенсионных взносов
  
  // Страховые взносы за сотрудников
  employeePensionRate: 22, // %
  employeeMedicalRate: 5.1, // %
  employeeSocialRate: 2.9, // %
  employeeTotalRate: 30, // % (единый тариф)
  employeeReducedRate: 15, // % (пониженный для МСП свыше МРОТ)
  mrot: 1916600, // МРОТ 2024 - 19 166 руб в копейках
  
  // Лимиты УСН
  usnIncomeLimit: 25100000000, // 251 млн руб в копейках
  usnEmployeeLimit: 130, // Человек
};

// Результат расчёта УСН 6%
export interface Usn6Result {
  income: number;
  taxBase: number;
  taxCalculated: number;
  insuranceDeduction: number; // Вычет страховых взносов
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

// Расчёт УСН 6% (Доходы)
export async function calculateUsn6(
  year: number,
  hasEmployees: boolean = false
): Promise<Usn6Result> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return emptyUsn6Result();
  }

  // Получаем доходы из КУДиР
  const { data: entries } = await supabase
    .from("kudir_entries")
    .select("entry_date, entry_type, amount")
    .eq("company_id", companyId)
    .eq("entry_type", "income")
    .gte("entry_date", `${year}-01-01`)
    .lte("entry_date", `${year}-12-31`);

  // Группируем по кварталам
  const quarterlyIncome = [0, 0, 0, 0];
  for (const entry of entries || []) {
    const month = new Date(entry.entry_date).getMonth();
    const quarter = Math.floor(month / 3);
    quarterlyIncome[quarter] += entry.amount;
  }

  // Получаем уплаченные страховые взносы
  const { data: insurancePayments } = await supabase
    .from("tax_payments")
    .select("due_date, paid_amount")
    .eq("company_id", companyId)
    .eq("tax_type", "insurance")
    .eq("status", "paid")
    .gte("due_date", `${year}-01-01`)
    .lte("due_date", `${year}-12-31`);

  // Группируем взносы по кварталам
  const quarterlyInsurance = [0, 0, 0, 0];
  for (const payment of insurancePayments || []) {
    const month = new Date(payment.due_date).getMonth();
    const quarter = Math.floor(month / 3);
    quarterlyInsurance[quarter] += payment.paid_amount || 0;
  }

  // Получаем уплаченные авансы УСН
  const { data: advancePayments } = await supabase
    .from("tax_payments")
    .select("period, paid_amount")
    .eq("company_id", companyId)
    .in("tax_type", ["usn", "usn_advance"])
    .eq("status", "paid")
    .gte("due_date", `${year}-01-01`)
    .lte("due_date", `${year}-12-31`);

  const paidAdvances = [0, 0, 0, 0];
  for (const payment of advancePayments || []) {
    const match = payment.period.match(/Q(\d)/);
    if (match) {
      const q = parseInt(match[1]) - 1;
      if (q >= 0 && q < 4) {
        paidAdvances[q] += payment.paid_amount || 0;
      }
    }
  }

  // Расчёт по кварталам (нарастающим итогом)
  const quarters: Usn6Result["quarters"] = [];
  let cumulativeIncome = 0;
  let cumulativeInsurance = 0;
  let cumulativePaidAdvances = 0;

  for (let q = 0; q < 4; q++) {
    cumulativeIncome += quarterlyIncome[q];
    cumulativeInsurance += quarterlyInsurance[q];
    cumulativePaidAdvances += paidAdvances[q];

    const taxCalculated = Math.round(cumulativeIncome * TAX_CONSTANTS_2024.usn6Rate / 100);
    
    // Вычет страховых взносов
    // Для ИП без сотрудников - 100%, с сотрудниками - до 50%
    const maxDeduction = hasEmployees ? Math.round(taxCalculated * 0.5) : taxCalculated;
    const insuranceDeduction = Math.min(cumulativeInsurance, maxDeduction);
    
    const taxAfterDeduction = taxCalculated - insuranceDeduction;
    const advancePayment = Math.max(0, taxAfterDeduction - cumulativePaidAdvances);

    quarters.push({
      quarter: q + 1,
      income: cumulativeIncome,
      taxCalculated,
      insuranceDeduction,
      advancePayment,
      paidAdvances: cumulativePaidAdvances,
    });
  }

  const lastQuarter = quarters[3];
  const totalIncome = lastQuarter.income;
  const totalTax = lastQuarter.taxCalculated;
  const totalDeduction = lastQuarter.insuranceDeduction;
  const taxToPay = lastQuarter.advancePayment;

  return {
    income: totalIncome,
    taxBase: totalIncome,
    taxCalculated: totalTax,
    insuranceDeduction: totalDeduction,
    taxToPay,
    effectiveRate: totalIncome > 0 ? (taxToPay / totalIncome) * 100 : 0,
    quarters,
  };
}

function emptyUsn6Result(): Usn6Result {
  return {
    income: 0,
    taxBase: 0,
    taxCalculated: 0,
    insuranceDeduction: 0,
    taxToPay: 0,
    effectiveRate: 0,
    quarters: [1, 2, 3, 4].map(q => ({
      quarter: q,
      income: 0,
      taxCalculated: 0,
      insuranceDeduction: 0,
      advancePayment: 0,
      paidAdvances: 0,
    })),
  };
}

// Результат расчёта УСН 15%
export interface Usn15Result {
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

// Расчёт УСН 15% (Доходы минус расходы)
export async function calculateUsn15(year: number): Promise<Usn15Result> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return emptyUsn15Result();
  }

  // Получаем записи КУДиР
  const { data: entries } = await supabase
    .from("kudir_entries")
    .select("entry_date, entry_type, amount")
    .eq("company_id", companyId)
    .gte("entry_date", `${year}-01-01`)
    .lte("entry_date", `${year}-12-31`);

  // Группируем по кварталам
  const quarterlyIncome = [0, 0, 0, 0];
  const quarterlyExpenses = [0, 0, 0, 0];

  for (const entry of entries || []) {
    const month = new Date(entry.entry_date).getMonth();
    const quarter = Math.floor(month / 3);
    
    if (entry.entry_type === "income") {
      quarterlyIncome[quarter] += entry.amount;
    } else {
      quarterlyExpenses[quarter] += entry.amount;
    }
  }

  // Получаем уплаченные авансы
  const { data: advancePayments } = await supabase
    .from("tax_payments")
    .select("period, paid_amount")
    .eq("company_id", companyId)
    .in("tax_type", ["usn", "usn_advance"])
    .eq("status", "paid")
    .gte("due_date", `${year}-01-01`)
    .lte("due_date", `${year}-12-31`);

  const paidAdvances = [0, 0, 0, 0];
  for (const payment of advancePayments || []) {
    const match = payment.period.match(/Q(\d)/);
    if (match) {
      const q = parseInt(match[1]) - 1;
      if (q >= 0 && q < 4) {
        paidAdvances[q] += payment.paid_amount || 0;
      }
    }
  }

  // Расчёт по кварталам
  const quarters: Usn15Result["quarters"] = [];
  let cumulativeIncome = 0;
  let cumulativeExpenses = 0;
  let cumulativePaidAdvances = 0;

  for (let q = 0; q < 4; q++) {
    cumulativeIncome += quarterlyIncome[q];
    cumulativeExpenses += quarterlyExpenses[q];
    cumulativePaidAdvances += paidAdvances[q];

    const taxBase = Math.max(0, cumulativeIncome - cumulativeExpenses);
    const taxCalculated = Math.round(taxBase * TAX_CONSTANTS_2024.usn15Rate / 100);
    const advancePayment = Math.max(0, taxCalculated - cumulativePaidAdvances);

    quarters.push({
      quarter: q + 1,
      income: cumulativeIncome,
      expenses: cumulativeExpenses,
      taxBase,
      taxCalculated,
      advancePayment,
      paidAdvances: cumulativePaidAdvances,
    });
  }

  const lastQuarter = quarters[3];
  const totalIncome = lastQuarter.income;
  const totalExpenses = lastQuarter.expenses;
  const taxBase = lastQuarter.taxBase;
  const taxCalculated = lastQuarter.taxCalculated;
  
  // Минимальный налог 1% от доходов
  const minTax = Math.round(totalIncome * TAX_CONSTANTS_2024.usn15MinRate / 100);
  const isMinTax = minTax > taxCalculated;
  const taxToPay = isMinTax ? minTax : lastQuarter.advancePayment;

  return {
    income: totalIncome,
    expenses: totalExpenses,
    taxBase,
    taxCalculated,
    minTax,
    taxToPay,
    isMinTax,
    effectiveRate: totalIncome > 0 ? (taxToPay / totalIncome) * 100 : 0,
    quarters,
  };
}

function emptyUsn15Result(): Usn15Result {
  return {
    income: 0,
    expenses: 0,
    taxBase: 0,
    taxCalculated: 0,
    minTax: 0,
    taxToPay: 0,
    isMinTax: false,
    effectiveRate: 0,
    quarters: [1, 2, 3, 4].map(q => ({
      quarter: q,
      income: 0,
      expenses: 0,
      taxBase: 0,
      taxCalculated: 0,
      advancePayment: 0,
      paidAdvances: 0,
    })),
  };
}

// Результат расчёта НДС
export interface VatResult {
  outputVat: number; // НДС к начислению
  inputVat: number;  // НДС к вычету
  vatToPay: number;  // НДС к уплате
  vatToRefund: number; // НДС к возмещению
  documents: {
    type: "output" | "input";
    documentNumber: string;
    counterpartyName: string;
    amount: number;
    vatAmount: number;
  }[];
}

// Расчёт НДС
export async function calculateVat(
  year: number,
  quarter: number
): Promise<VatResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return { outputVat: 0, inputVat: 0, vatToPay: 0, vatToRefund: 0, documents: [] };
  }

  // Определяем период
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const dateFrom = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const dateTo = `${year}-${String(endMonth).padStart(2, "0")}-${endMonth === 2 ? 28 : (endMonth % 2 === 0 && endMonth !== 8 ? 30 : 31)}`;

  // Получаем документы с НДС
  const { data: docs } = await supabase
    .from("accounting_documents")
    .select(`
      document_type,
      document_number,
      total_amount,
      vat_amount,
      accounting_counterparties(name)
    `)
    .eq("company_id", companyId)
    .gte("document_date", dateFrom)
    .lte("document_date", dateTo)
    .not("vat_amount", "is", null);

  let outputVat = 0;
  let inputVat = 0;
  const documents: VatResult["documents"] = [];

  for (const doc of docs || []) {
    const counterpartyData = doc.accounting_counterparties as unknown as { name: string }[] | { name: string } | null;
    const counterparty = Array.isArray(counterpartyData) ? counterpartyData[0] : counterpartyData;
    const vatAmount = doc.vat_amount || 0;

    // Исходящие документы
    if (["invoice", "act", "invoice_upd"].includes(doc.document_type)) {
      outputVat += vatAmount;
      documents.push({
        type: "output",
        documentNumber: doc.document_number,
        counterpartyName: counterparty?.name || "—",
        amount: doc.total_amount,
        vatAmount,
      });
    }
    // Входящие документы
    else if (["purchase_invoice", "expense"].includes(doc.document_type)) {
      inputVat += vatAmount;
      documents.push({
        type: "input",
        documentNumber: doc.document_number,
        counterpartyName: counterparty?.name || "—",
        amount: doc.total_amount,
        vatAmount,
      });
    }
  }

  const vatDiff = outputVat - inputVat;

  return {
    outputVat,
    inputVat,
    vatToPay: vatDiff > 0 ? vatDiff : 0,
    vatToRefund: vatDiff < 0 ? Math.abs(vatDiff) : 0,
    documents,
  };
}

// Результат расчёта страховых взносов ИП
export interface IpInsuranceResult {
  fixedContributions: number;
  excessContributions: number;
  totalContributions: number;
  income: number;
  excessIncome: number;
  deadlines: {
    type: string;
    amount: number;
    dueDate: string;
  }[];
}

// Расчёт страховых взносов ИП
export async function calculateIpInsurance(year: number): Promise<IpInsuranceResult> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();

  if (!companyId) {
    return {
      fixedContributions: TAX_CONSTANTS_2024.ipFixedTotal,
      excessContributions: 0,
      totalContributions: TAX_CONSTANTS_2024.ipFixedTotal,
      income: 0,
      excessIncome: 0,
      deadlines: [],
    };
  }

  // Получаем доходы из КУДиР
  const { data: entries } = await supabase
    .from("kudir_entries")
    .select("amount")
    .eq("company_id", companyId)
    .eq("entry_type", "income")
    .gte("entry_date", `${year}-01-01`)
    .lte("entry_date", `${year}-12-31`);

  const totalIncome = (entries || []).reduce((sum, e) => sum + e.amount, 0);
  
  // Расчёт 1% с превышения
  const excessIncome = Math.max(0, totalIncome - TAX_CONSTANTS_2024.ipExcessThreshold);
  let excessContributions = Math.round(excessIncome * TAX_CONSTANTS_2024.ipExcessRate / 100);
  
  // Ограничение максимумом
  const maxExcess = TAX_CONSTANTS_2024.ipMaxPension - TAX_CONSTANTS_2024.ipFixedTotal;
  excessContributions = Math.min(excessContributions, maxExcess);

  const totalContributions = TAX_CONSTANTS_2024.ipFixedTotal + excessContributions;

  return {
    fixedContributions: TAX_CONSTANTS_2024.ipFixedTotal,
    excessContributions,
    totalContributions,
    income: totalIncome,
    excessIncome,
    deadlines: [
      {
        type: "Фиксированные взносы",
        amount: TAX_CONSTANTS_2024.ipFixedTotal,
        dueDate: `${year}-12-31`,
      },
      {
        type: "1% с превышения",
        amount: excessContributions,
        dueDate: `${year + 1}-07-01`,
      },
    ],
  };
}

// Результат расчёта взносов за сотрудников
export interface EmployeeInsuranceResult {
  employees: {
    name: string;
    salary: number;
    pensionContribution: number;
    medicalContribution: number;
    socialContribution: number;
    totalContribution: number;
  }[];
  totals: {
    totalSalary: number;
    totalPension: number;
    totalMedical: number;
    totalSocial: number;
    totalContributions: number;
  };
  monthlyTotal: number;
}

// Расчёт страховых взносов за сотрудников (упрощённый)
export async function calculateEmployeeInsurance(
  salaries: { name: string; salary: number }[]
): Promise<EmployeeInsuranceResult> {
  const employees = salaries.map(emp => {
    const salary = emp.salary;
    
    // Базовые ставки 30% до МРОТ, 15% свыше МРОТ (для МСП)
    let pensionContribution: number;
    let medicalContribution: number;
    let socialContribution: number;

    if (salary <= TAX_CONSTANTS_2024.mrot) {
      // Полные ставки
      pensionContribution = Math.round(salary * TAX_CONSTANTS_2024.employeePensionRate / 100);
      medicalContribution = Math.round(salary * TAX_CONSTANTS_2024.employeeMedicalRate / 100);
      socialContribution = Math.round(salary * TAX_CONSTANTS_2024.employeeSocialRate / 100);
    } else {
      // До МРОТ - полные ставки, свыше - пониженные 15%
      const basePart = TAX_CONSTANTS_2024.mrot;
      const excessPart = salary - basePart;
      
      pensionContribution = Math.round(basePart * TAX_CONSTANTS_2024.employeePensionRate / 100) +
                           Math.round(excessPart * 10 / 100); // 10% пенсионные свыше МРОТ
      medicalContribution = Math.round(basePart * TAX_CONSTANTS_2024.employeeMedicalRate / 100) +
                           Math.round(excessPart * 5 / 100); // 5% медицинские свыше МРОТ
      socialContribution = Math.round(basePart * TAX_CONSTANTS_2024.employeeSocialRate / 100);
      // Социальные свыше МРОТ = 0% для МСП
    }

    const totalContribution = pensionContribution + medicalContribution + socialContribution;

    return {
      name: emp.name,
      salary,
      pensionContribution,
      medicalContribution,
      socialContribution,
      totalContribution,
    };
  });

  const totals = employees.reduce(
    (acc, emp) => ({
      totalSalary: acc.totalSalary + emp.salary,
      totalPension: acc.totalPension + emp.pensionContribution,
      totalMedical: acc.totalMedical + emp.medicalContribution,
      totalSocial: acc.totalSocial + emp.socialContribution,
      totalContributions: acc.totalContributions + emp.totalContribution,
    }),
    { totalSalary: 0, totalPension: 0, totalMedical: 0, totalSocial: 0, totalContributions: 0 }
  );

  return {
    employees,
    totals,
    monthlyTotal: totals.totalContributions,
  };
}

// Экспорт констант
export { TAX_CONSTANTS_2024 };
