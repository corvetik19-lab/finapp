import { createRSCClient } from "@/lib/supabase/server";

interface DocumentData {
  investor_name: string;
  investor_email: string;
  investment_number: string;
  investment_amount: number;
  interest_rate: number;
  start_date: string;
  end_date: string;
  tender_subject?: string;
  company_name: string;
  current_date: string;
  [key: string]: string | number | undefined;
}

interface GeneratedDocument {
  id: string;
  title: string;
  content: string;
  file_path?: string;
}

/**
 * Заполняет шаблон переменными
 */
export function fillTemplate(template: string, data: DocumentData): string {
  let result = template;
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    const formattedValue = formatValue(key, value);
    result = result.replace(new RegExp(placeholder, "g"), formattedValue);
  }
  
  return result;
}

/**
 * Форматирует значение в зависимости от типа
 */
function formatValue(key: string, value: string | number | undefined): string {
  if (value === undefined || value === null) return "—";
  
  if (key.includes("amount") && typeof value === "number") {
    return formatMoney(value);
  }
  
  if (key.includes("rate") && typeof value === "number") {
    return `${value}%`;
  }
  
  if (key.includes("date") && typeof value === "string") {
    return formatDate(value);
  }
  
  return String(value);
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Генерирует документ из шаблона и сохраняет в БД
 */
export async function generateDocument(
  templateId: string,
  investmentId: string,
  additionalData?: Partial<DocumentData>
): Promise<GeneratedDocument | null> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Получаем шаблон
  const { data: template } = await supabase
    .from("investor_contract_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) return null;

  // Получаем данные инвестиции
  const { data: investment } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources!investments_source_id_fkey(name, contact_email),
      tender:tenders(subject)
    `)
    .eq("id", investmentId)
    .single();

  if (!investment) return null;

  // Получаем данные компании
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("user_id", user.id)
    .single();

  // Собираем данные для заполнения
  const documentData: DocumentData = {
    investor_name: investment.source?.name || "—",
    investor_email: investment.source?.contact_email || "—",
    investment_number: investment.investment_number || "—",
    investment_amount: investment.approved_amount || 0,
    interest_rate: investment.interest_rate || 0,
    start_date: investment.start_date || new Date().toISOString(),
    end_date: investment.due_date || new Date().toISOString(),
    tender_subject: investment.tender?.subject || "—",
    company_name: company?.name || "—",
    current_date: new Date().toISOString(),
    ...additionalData,
  };

  // Заполняем шаблон
  const filledContent = fillTemplate(template.content, documentData);

  // Генерируем номер документа
  const documentNumber = `DOC-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

  // Сохраняем документ
  const { data: document, error } = await supabase
    .from("investor_documents")
    .insert({
      user_id: user.id,
      investment_id: investmentId,
      template_id: templateId,
      document_type: template.template_type,
      document_number: documentNumber,
      title: `${template.name} - ${investment.investment_number}`,
      content: filledContent,
      status: "draft",
      metadata: {
        generated_at: new Date().toISOString(),
        template_version: template.version,
        variables_used: Object.keys(documentData),
      },
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving document:", error);
    return null;
  }

  return {
    id: document.id,
    title: document.title,
    content: filledContent,
    file_path: document.file_path,
  };
}

/**
 * Генерирует HTML для печати/PDF
 */
export function generatePrintableHTML(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      max-width: 21cm;
      margin: 0 auto;
      padding: 2cm;
    }
    
    h1 {
      font-size: 16pt;
      text-align: center;
      margin-bottom: 1.5em;
    }
    
    h2 {
      font-size: 14pt;
      margin-top: 1.5em;
    }
    
    p {
      text-align: justify;
      text-indent: 1.25cm;
      margin: 0.5em 0;
    }
    
    .signature-block {
      margin-top: 3em;
      display: flex;
      justify-content: space-between;
    }
    
    .signature {
      width: 45%;
    }
    
    .signature-line {
      border-bottom: 1px solid #000;
      margin-top: 3em;
      margin-bottom: 0.5em;
    }
    
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>
  `.trim();
}

/**
 * Генерирует акт сверки
 */
export async function generateReconciliationAct(
  investmentId: string,
  periodStart: string,
  periodEnd: string
): Promise<string | null> {
  const supabase = await createRSCClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Получаем инвестицию с транзакциями
  const { data: investment } = await supabase
    .from("investments")
    .select(`
      *,
      source:investment_sources!investments_source_id_fkey(name),
      transactions:investment_transactions(*)
    `)
    .eq("id", investmentId)
    .single();

  if (!investment) return null;

  // Фильтруем транзакции по периоду
  const periodTransactions = (investment.transactions || []).filter(
    (t: { created_at: string }) => {
      const date = new Date(t.created_at);
      return date >= new Date(periodStart) && date <= new Date(periodEnd);
    }
  );

  // Рассчитываем итоги
  const totalReceived = periodTransactions
    .filter((t: { transaction_type: string }) => t.transaction_type === "receipt")
    .reduce((sum: number, t: { amount: number }) => sum + (t.amount || 0), 0);

  const totalReturned = periodTransactions
    .filter((t: { transaction_type: string }) => t.transaction_type === "return")
    .reduce((sum: number, t: { amount: number }) => sum + (t.amount || 0), 0);

  const content = `
<h1>АКТ СВЕРКИ</h1>
<p style="text-align: center">взаимных расчётов за период с ${formatDate(periodStart)} по ${formatDate(periodEnd)}</p>

<p>Мы, нижеподписавшиеся, представители:</p>
<p><strong>${investment.source?.name || "Инвестор"}</strong> с одной стороны,</p>
<p>и представитель Заёмщика с другой стороны,</p>
<p>составили настоящий акт о нижеследующем:</p>

<h2>1. По данным Заёмщика</h2>
<table style="width: 100%; border-collapse: collapse; margin: 1em 0;">
  <tr style="border-bottom: 1px solid #000;">
    <td style="padding: 8px;">Задолженность на начало периода:</td>
    <td style="padding: 8px; text-align: right;">${formatMoney(investment.approved_amount)}</td>
  </tr>
  <tr style="border-bottom: 1px solid #000;">
    <td style="padding: 8px;">Получено за период:</td>
    <td style="padding: 8px; text-align: right;">${formatMoney(totalReceived)}</td>
  </tr>
  <tr style="border-bottom: 1px solid #000;">
    <td style="padding: 8px;">Возвращено за период:</td>
    <td style="padding: 8px; text-align: right;">${formatMoney(totalReturned)}</td>
  </tr>
  <tr style="font-weight: bold;">
    <td style="padding: 8px;">Задолженность на конец периода:</td>
    <td style="padding: 8px; text-align: right;">${formatMoney(investment.approved_amount + totalReceived - totalReturned)}</td>
  </tr>
</table>

<h2>2. По данным Инвестора</h2>
<p>_________________________________ (заполняется Инвестором)</p>

<h2>3. Расхождения</h2>
<p>_________________________________ (при наличии)</p>

<div class="signature-block">
  <div class="signature">
    <p><strong>От Заёмщика:</strong></p>
    <div class="signature-line"></div>
    <p>Подпись / ФИО</p>
    <p>М.П.</p>
  </div>
  <div class="signature">
    <p><strong>От Инвестора:</strong></p>
    <div class="signature-line"></div>
    <p>Подпись / ФИО</p>
    <p>М.П.</p>
  </div>
</div>

<p style="margin-top: 2em; text-align: center; font-size: 10pt; color: #666;">
  Дата составления: ${formatDate(new Date().toISOString())}
</p>
  `.trim();

  return generatePrintableHTML(content, `Акт сверки - ${investment.investment_number}`);
}
