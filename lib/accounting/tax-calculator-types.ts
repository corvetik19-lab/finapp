// Типы и константы для налоговых калькуляторов
// (вынесены из tax-calculator-service.ts для совместимости с "use server")

// Константы для расчётов 2024 года
export const TAX_CONSTANTS_2024 = {
  // УСН
  usn6Rate: 6,
  usn15Rate: 15,
  usn15MinRate: 1,
  
  // НДС
  vat20Rate: 20,
  vat10Rate: 10,
  vat0Rate: 0,
  
  // Страховые взносы ИП
  ipFixedPension: 4943700,
  ipFixedMedical: 2940300,
  ipFixedTotal: 4943700,
  ipExcessRate: 1,
  ipExcessThreshold: 30000000,
  ipMaxPension: 27747800,
  
  // Страховые взносы за сотрудников
  employeePensionRate: 22,
  employeeMedicalRate: 5.1,
  employeeSocialRate: 2.9,
  employeeTotalRate: 30,
  employeeReducedRate: 15,
  mrot: 1916600,
  
  // Лимиты УСН
  usnIncomeLimit: 25100000000,
  usnEmployeeLimit: 130,
};

// Результат расчёта УСН 6%
export interface Usn6Result {
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

// Результат расчёта НДС
export interface VatResult {
  outputVat: number;
  inputVat: number;
  vatToPay: number;
  vatToRefund: number;
  documents: {
    type: "output" | "input";
    documentNumber: string;
    counterpartyName: string;
    amount: number;
    vatAmount: number;
  }[];
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
