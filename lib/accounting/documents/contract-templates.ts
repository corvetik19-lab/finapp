"use server";

import { createRSCClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/platform/organization";
import type { ContractType, ContractTemplateVariable, ContractTemplate, GeneratedContract } from "./contract-templates-types";

// Re-export types for consumers
export type { ContractType, ContractTemplateVariable, ContractTemplate, GeneratedContract };

// ============================================
// Системные шаблоны
// ============================================

const SYSTEM_TEMPLATES: Omit<ContractTemplate, "id" | "company_id" | "created_at" | "updated_at">[] = [
  {
    name: "Договор поставки",
    contract_type: "supply",
    description: "Стандартный договор поставки товаров",
    is_system: true,
    variables: [
      { key: "contract_number", label: "Номер договора", type: "text", required: true },
      { key: "contract_date", label: "Дата договора", type: "date", required: true },
      { key: "supplier_name", label: "Наименование поставщика", type: "text", required: true },
      { key: "supplier_inn", label: "ИНН поставщика", type: "text", required: true },
      { key: "supplier_address", label: "Адрес поставщика", type: "text", required: true },
      { key: "buyer_name", label: "Наименование покупателя", type: "text", required: true },
      { key: "buyer_inn", label: "ИНН покупателя", type: "text", required: true },
      { key: "buyer_address", label: "Адрес покупателя", type: "text", required: true },
      { key: "subject", label: "Предмет договора", type: "textarea", required: true },
      { key: "total_amount", label: "Сумма договора", type: "number", required: true },
      { key: "delivery_term", label: "Срок поставки (дней)", type: "number", required: true, default_value: "30" },
      { key: "payment_term", label: "Срок оплаты (дней)", type: "number", required: true, default_value: "14" },
    ],
    content: `ДОГОВОР ПОСТАВКИ №{{contract_number}}

г. Москва                                                      {{contract_date}}

{{supplier_name}}, ИНН {{supplier_inn}}, в лице _________________________, действующего на основании _____________, именуемое в дальнейшем «Поставщик», с одной стороны, и

{{buyer_name}}, ИНН {{buyer_inn}}, в лице _________________________, действующего на основании _____________, именуемое в дальнейшем «Покупатель», с другой стороны,

заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА

1.1. Поставщик обязуется передать в собственность Покупателю, а Покупатель обязуется принять и оплатить следующий товар:
{{subject}}

1.2. Общая сумма договора составляет {{total_amount}} рублей, в том числе НДС.

2. СРОКИ И УСЛОВИЯ ПОСТАВКИ

2.1. Поставка товара осуществляется в течение {{delivery_term}} календарных дней с момента подписания настоящего Договора.

2.2. Поставка осуществляется по адресу: {{buyer_address}}

3. ПОРЯДОК РАСЧЁТОВ

3.1. Оплата производится в течение {{payment_term}} календарных дней с момента получения товара.

3.2. Форма оплаты — безналичный расчёт.

4. ОТВЕТСТВЕННОСТЬ СТОРОН

4.1. За нарушение сроков поставки Поставщик уплачивает пени в размере 0,1% от стоимости недопоставленного товара за каждый день просрочки.

4.2. За нарушение сроков оплаты Покупатель уплачивает пени в размере 0,1% от суммы задолженности за каждый день просрочки.

5. СРОК ДЕЙСТВИЯ ДОГОВОРА

5.1. Настоящий Договор вступает в силу с момента подписания и действует до полного исполнения сторонами своих обязательств.

6. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН

ПОСТАВЩИК:                                    ПОКУПАТЕЛЬ:
{{supplier_name}}                             {{buyer_name}}
ИНН {{supplier_inn}}                          ИНН {{buyer_inn}}
{{supplier_address}}                          {{buyer_address}}

___________________ /____________/            ___________________ /____________/
`,
  },
  {
    name: "Договор оказания услуг",
    contract_type: "service",
    description: "Стандартный договор на оказание услуг",
    is_system: true,
    variables: [
      { key: "contract_number", label: "Номер договора", type: "text", required: true },
      { key: "contract_date", label: "Дата договора", type: "date", required: true },
      { key: "executor_name", label: "Наименование исполнителя", type: "text", required: true },
      { key: "executor_inn", label: "ИНН исполнителя", type: "text", required: true },
      { key: "customer_name", label: "Наименование заказчика", type: "text", required: true },
      { key: "customer_inn", label: "ИНН заказчика", type: "text", required: true },
      { key: "services", label: "Описание услуг", type: "textarea", required: true },
      { key: "total_amount", label: "Стоимость услуг", type: "number", required: true },
      { key: "execution_term", label: "Срок оказания услуг", type: "text", required: true },
    ],
    content: `ДОГОВОР ОКАЗАНИЯ УСЛУГ №{{contract_number}}

г. Москва                                                      {{contract_date}}

{{executor_name}}, ИНН {{executor_inn}}, именуемое в дальнейшем «Исполнитель», с одной стороны, и

{{customer_name}}, ИНН {{customer_inn}}, именуемое в дальнейшем «Заказчик», с другой стороны,

заключили настоящий Договор о нижеследующем:

1. ПРЕДМЕТ ДОГОВОРА

1.1. Исполнитель обязуется оказать Заказчику следующие услуги:
{{services}}

1.2. Заказчик обязуется принять и оплатить услуги в порядке, предусмотренном настоящим Договором.

2. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЁТОВ

2.1. Стоимость услуг по настоящему Договору составляет {{total_amount}} рублей.

2.2. Оплата производится на основании акта выполненных работ.

3. СРОКИ ОКАЗАНИЯ УСЛУГ

3.1. Услуги оказываются в следующие сроки: {{execution_term}}.

4. ПОРЯДОК СДАЧИ-ПРИЁМКИ УСЛУГ

4.1. По завершении оказания услуг Исполнитель предоставляет Заказчику акт выполненных работ.

4.2. Заказчик в течение 5 рабочих дней подписывает акт или направляет мотивированный отказ.

5. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН

ИСПОЛНИТЕЛЬ:                                  ЗАКАЗЧИК:
{{executor_name}}                             {{customer_name}}
ИНН {{executor_inn}}                          ИНН {{customer_inn}}

___________________ /____________/            ___________________ /____________/
`,
  },
];

// ============================================
// CRUD операции
// ============================================

export async function getContractTemplates(): Promise<ContractTemplate[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("is_system", { ascending: false })
    .order("name");
  
  return data || [];
}

export async function getContractTemplate(id: string): Promise<ContractTemplate | null> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return null;
  
  const { data } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  return data;
}

export async function createContractTemplate(
  template: Omit<ContractTemplate, "id" | "company_id" | "created_at" | "updated_at" | "is_system">
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { data, error } = await supabase
    .from("contract_templates")
    .insert({
      ...template,
      company_id: companyId,
      is_system: false,
    })
    .select("id")
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, id: data?.id };
}

export async function updateContractTemplate(
  id: string,
  updates: Partial<ContractTemplate>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  // Нельзя редактировать системные шаблоны
  const { data: existing } = await supabase
    .from("contract_templates")
    .select("is_system")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  if (existing?.is_system) {
    return { success: false, error: "Системные шаблоны нельзя редактировать" };
  }
  
  const { error } = await supabase
    .from("contract_templates")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

export async function deleteContractTemplate(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  // Нельзя удалять системные шаблоны
  const { data: existing } = await supabase
    .from("contract_templates")
    .select("is_system")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  
  if (existing?.is_system) {
    return { success: false, error: "Системные шаблоны нельзя удалить" };
  }
  
  const { error } = await supabase
    .from("contract_templates")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// ============================================
// Инициализация системных шаблонов
// ============================================

export async function initializeSystemTemplates(): Promise<void> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return;
  
  // Проверяем, есть ли уже системные шаблоны
  const { data: existing } = await supabase
    .from("contract_templates")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_system", true)
    .limit(1);
  
  if (existing && existing.length > 0) return;
  
  // Создаём системные шаблоны
  for (const template of SYSTEM_TEMPLATES) {
    await supabase
      .from("contract_templates")
      .insert({
        ...template,
        company_id: companyId,
      });
  }
}

// ============================================
// Генерация договора
// ============================================

export async function generateContract(
  templateId: string,
  variables: Record<string, string>,
  counterpartyId?: string,
  counterpartyName?: string
): Promise<{ success: boolean; contract?: GeneratedContract; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  // Получаем шаблон
  const template = await getContractTemplate(templateId);
  if (!template) {
    return { success: false, error: "Шаблон не найден" };
  }
  
  // Заменяем переменные
  let content = template.content;
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  
  // Создаём договор
  const contract: Omit<GeneratedContract, "id" | "created_at"> = {
    company_id: companyId,
    template_id: templateId,
    contract_number: variables.contract_number || "",
    contract_date: variables.contract_date || new Date().toISOString().split("T")[0],
    counterparty_id: counterpartyId,
    counterparty_name: counterpartyName || variables.supplier_name || variables.executor_name || variables.customer_name || "",
    variables,
    content,
    status: "draft",
  };
  
  const { data, error } = await supabase
    .from("generated_contracts")
    .insert(contract)
    .select()
    .single();
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true, contract: data };
}

// ============================================
// Сгенерированные договоры
// ============================================

export async function getGeneratedContracts(): Promise<GeneratedContract[]> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) return [];
  
  const { data } = await supabase
    .from("generated_contracts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  
  return data || [];
}

export async function updateContractStatus(
  id: string,
  status: GeneratedContract["status"]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createRSCClient();
  const companyId = await getCurrentCompanyId();
  
  if (!companyId) {
    return { success: false, error: "Не авторизован" };
  }
  
  const { error } = await supabase
    .from("generated_contracts")
    .update({ status })
    .eq("id", id)
    .eq("company_id", companyId);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// Константы экспортируются из ./contract-templates-types.ts
