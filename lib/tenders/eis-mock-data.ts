/**
 * Мок-данные для эмуляции API ЕИС (Единая информационная система закупок)
 * В будущем заменить на реальный API
 */

export interface EISTenderData {
  purchase_number: string;
  subject: string;
  customer: string;
  nmck: number; // в рублях
  platform?: string;
  procurement_method?: string;
  tender_type?: string;
  submission_deadline?: string;
  auction_date?: string;
  results_date?: string;
  application_review_date?: string;
  bid_security?: number; // в рублях
  contract_security?: number; // в рублях
  eis_url?: string;
}

/**
 * Мок-данные тендеров из ЕИС
 */
const MOCK_EIS_TENDERS: Record<string, EISTenderData> = {
  '32515383401': {
    purchase_number: '32515383401',
    subject: 'ОКПД 2 28.23.2 Поставка расходных материалов и запасных частей для копировальной и оргтехники для нужд ПАО "Магаданэнерго" (Лот № 23501-ЭКСП ПРОД-2025-МЭ)',
    customer: 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО ЭНЕРГЕТИКИ И ЭЛЕКТРИФИКАЦИИ "МАГАДАНЭНЕРГО"',
    nmck: 5645255.27,
    platform: 'РусГидро',
    procurement_method: 'Запрос предложений в электронной форме',
    tender_type: 'ФЗ-223',
    submission_deadline: '2025-11-20T07:00:00Z',
    results_date: '2025-11-28T00:00:00Z',
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/notice223/common-info.html?noticeInfoId=19004711',
  },
  '32312315116': {
    purchase_number: '32312315116',
    subject: 'СИП (самонесущий изолированный провод)',
    customer: 'АКЦИОНЕРНОЕ ОБЩЕСТВО "КАВАЛЕРОВСКАЯ ЭЛЕКТРОСЕТЬ"',
    nmck: 1583893.50,
    platform: 'ESTP',
    procurement_method: 'Электронный аукцион',
    tender_type: 'ФЗ-44',
    submission_deadline: '2025-11-20T15:00:00Z',
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0123456789012345678',
  },
  // Добавьте больше мок-данных по мере необходимости
  '32409876543': {
    purchase_number: '32409876543',
    subject: 'Поставка медицинского оборудования для нужд ГБУЗ',
    customer: 'ГОСУДАРСТВЕННОЕ БЮДЖЕТНОЕ УЧРЕЖДЕНИЕ ЗДРАВООХРАНЕНИЯ "ГОРОДСКАЯ БОЛЬНИЦА №1"',
    nmck: 12500000.00,
    platform: 'РТС-тендер',
    procurement_method: 'Конкурс',
    tender_type: 'ФЗ-44',
    submission_deadline: '2025-12-15T10:00:00Z',
    auction_date: '2025-12-20T12:00:00Z',
    results_date: '2025-12-25T00:00:00Z',
    bid_security: 625000.00, // 5% от НМЦК
    contract_security: 1250000.00, // 10% от НМЦК
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0324098765430000001',
  },
  // Новые тестовые тендеры с полным заполнением
  '0173200000124000001': {
    purchase_number: '0173200000124000001',
    subject: 'Поставка компьютерного оборудования и периферийных устройств для автоматизации рабочих мест',
    customer: 'МИНИСТЕРСТВО ЦИФРОВОГО РАЗВИТИЯ, СВЯЗИ И МАССОВЫХ КОММУНИКАЦИЙ РОССИЙСКОЙ ФЕДЕРАЦИИ',
    nmck: 8750000.00,
    platform: 'Сбербанк-АСТ',
    procurement_method: 'Электронный аукцион',
    tender_type: 'ФЗ-44',
    submission_deadline: '2025-11-25T12:00:00Z',
    auction_date: '2025-11-28T10:00:00Z',
    results_date: '2025-12-05T00:00:00Z',
    application_review_date: '2025-11-26T00:00:00Z',
    bid_security: 437500.00, // 5% от НМЦК
    contract_security: 875000.00, // 10% от НМЦК
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0173200000124000001',
  },
  '0372100000124000002': {
    purchase_number: '0372100000124000002',
    subject: 'Выполнение работ по капитальному ремонту систем отопления, вентиляции и кондиционирования административного здания',
    customer: 'ФЕДЕРАЛЬНОЕ ГОСУДАРСТВЕННОЕ БЮДЖЕТНОЕ УЧРЕЖДЕНИЕ "УПРАВЛЕНИЕ ДЕЛАМИ ПРЕЗИДЕНТА РОССИЙСКОЙ ФЕДЕРАЦИИ"',
    nmck: 15300000.00,
    platform: 'Единая электронная торговая площадка (ЕЭТП)',
    procurement_method: 'Открытый конкурс в электронной форме',
    tender_type: 'ФЗ-44',
    submission_deadline: '2025-12-01T09:00:00Z',
    auction_date: '2025-12-08T14:00:00Z',
    results_date: '2025-12-15T00:00:00Z',
    application_review_date: '2025-12-03T00:00:00Z',
    bid_security: 765000.00, // 5% от НМЦК
    contract_security: 1530000.00, // 10% от НМЦК
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0372100000124000002',
  },
  '32515400000124000003': {
    purchase_number: '32515400000124000003',
    subject: 'Оказание услуг по технической поддержке и сопровождению программного обеспечения информационных систем',
    customer: 'ПУБЛИЧНОЕ АКЦИОНЕРНОЕ ОБЩЕСТВО "РОССИЙСКИЕ ЖЕЛЕЗНЫЕ ДОРОГИ"',
    nmck: 24500000.00,
    platform: 'Фабрикант',
    procurement_method: 'Запрос предложений в электронной форме',
    tender_type: 'ФЗ-223',
    submission_deadline: '2025-11-22T16:00:00Z',
    auction_date: '2025-11-25T11:00:00Z',
    results_date: '2025-11-30T00:00:00Z',
    application_review_date: '2025-11-23T00:00:00Z',
    bid_security: 1225000.00, // 5% от НМЦК
    contract_security: 2450000.00, // 10% от НМЦК
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/notice223/common-info.html?noticeInfoId=19004800',
  },
  // Тестовые тендеры для демонстрации
  '0373100000123000001': {
    purchase_number: '0373100000123000001',
    subject: 'Поставка медицинского оборудования для отделения реанимации и интенсивной терапии',
    customer: 'ГБУЗ "Городская клиническая больница №1 им. Н.И. Пирогова"',
    nmck: 12500000.00,
    platform: 'РТС-тендер',
    procurement_method: 'Электронный аукцион',
    tender_type: 'ФЗ-44',
    submission_deadline: '2025-11-22T07:00:00Z',
    auction_date: '2025-11-24T10:00:00Z',
    results_date: '2025-11-27T00:00:00Z',
    application_review_date: '2025-11-23T00:00:00Z',
    bid_security: 625000.00, // 5% от НМЦК
    contract_security: 1250000.00, // 10% от НМЦК
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0373100000123000001',
  },
  '0373200000123000002': {
    purchase_number: '0373200000123000002',
    subject: 'Капитальный ремонт кровли здания поликлиники с заменой водосточной системы',
    customer: 'ГБУЗ МО "Подольская городская поликлиника №3"',
    nmck: 8500000.00,
    platform: 'ЭТП ГПБ',
    procurement_method: 'Запрос котировок',
    tender_type: 'ЗМО',
    submission_deadline: '2025-11-19T15:00:00Z',
    auction_date: '2025-11-20T12:00:00Z',
    results_date: '2025-11-22T00:00:00Z',
    application_review_date: '2025-11-20T00:00:00Z',
    bid_security: 425000.00, // 5% от НМЦК
    contract_security: 795000.00, // ~9.4% от НМЦК
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/ea44/view/common-info.html?regNumber=0373200000123000002',
  },
  '0373100000123000003': {
    purchase_number: '0373100000123000003',
    subject: 'Поставка лекарственных препаратов для лечения сердечно-сосудистых заболеваний',
    customer: 'ГБУЗ "Московский областной кардиологический центр"',
    nmck: 32000000.00,
    platform: 'Сбербанк-АСТ',
    procurement_method: 'Конкурс',
    tender_type: 'ФЗ-223',
    submission_deadline: '2025-11-02T10:00:00Z',
    auction_date: '2025-11-07T14:00:00Z',
    results_date: '2025-11-12T00:00:00Z',
    application_review_date: '2025-11-05T00:00:00Z',
    bid_security: 1600000.00, // 5% от НМЦК
    contract_security: 2980000.00, // ~9.3% от цены контракта
    eis_url: 'https://zakupki.gov.ru/epz/order/notice/notice223/common-info.html?noticeInfoId=19004900',
  },
};

/**
 * Эмуляция поиска тендера в ЕИС по номеру
 * @param purchaseNumber - номер закупки
 * @returns данные тендера или null, если не найден
 */
export async function searchTenderInEIS(
  purchaseNumber: string
): Promise<EISTenderData | null> {
  // Эмуляция задержки сети (500-1500ms)
  const delay = Math.random() * 1000 + 500;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Нормализация номера (удаление пробелов и спецсимволов)
  const normalizedNumber = purchaseNumber.replace(/\s+/g, '').trim();

  // Поиск в мок-данных
  const tenderData = MOCK_EIS_TENDERS[normalizedNumber];

  if (!tenderData) {
    return null;
  }

  return tenderData;
}

/**
 * Эмуляция получения документации тендера
 * В реальности это будет загрузка файлов из ЕИС
 */
export interface EISDocument {
  id: string;
  name: string;
  type: 'technical_specification' | 'draft_contract' | 'other';
  size: number; // в байтах
  url: string;
}

const MOCK_DOCUMENTS: Record<string, EISDocument[]> = {
  '32515383401': [
    {
      id: '1',
      name: 'Техническое задание.pdf',
      type: 'technical_specification',
      size: 2456789,
      url: '/mock/documents/tz_32515383401.pdf',
    },
    {
      id: '2',
      name: 'Проект контракта.docx',
      type: 'draft_contract',
      size: 156789,
      url: '/mock/documents/contract_32515383401.docx',
    },
    {
      id: '3',
      name: 'Спецификация оборудования.xlsx',
      type: 'other',
      size: 89456,
      url: '/mock/documents/spec_32515383401.xlsx',
    },
  ],
  '32312315116': [
    {
      id: '4',
      name: 'Техническое задание СИП.pdf',
      type: 'technical_specification',
      size: 1234567,
      url: '/mock/documents/tz_32312315116.pdf',
    },
    {
      id: '5',
      name: 'Проект контракта.pdf',
      type: 'draft_contract',
      size: 234567,
      url: '/mock/documents/contract_32312315116.pdf',
    },
  ],
  '32409876543': [
    {
      id: '6',
      name: 'Техническое задание медоборудование.pdf',
      type: 'technical_specification',
      size: 3456789,
      url: '/mock/documents/tz_32409876543.pdf',
    },
    {
      id: '7',
      name: 'Проект контракта.docx',
      type: 'draft_contract',
      size: 456789,
      url: '/mock/documents/contract_32409876543.docx',
    },
    {
      id: '8',
      name: 'Перечень медицинского оборудования.xlsx',
      type: 'other',
      size: 123456,
      url: '/mock/documents/equipment_32409876543.xlsx',
    },
    {
      id: '9',
      name: 'Требования к сертификации.pdf',
      type: 'other',
      size: 234567,
      url: '/mock/documents/certification_32409876543.pdf',
    },
  ],
  '0173200000124000001': [
    {
      id: '10',
      name: 'Техническое задание компьютерное оборудование.pdf',
      type: 'technical_specification',
      size: 2345678,
      url: '/mock/documents/tz_0173200000124000001.pdf',
    },
    {
      id: '11',
      name: 'Проект контракта.pdf',
      type: 'draft_contract',
      size: 345678,
      url: '/mock/documents/contract_0173200000124000001.pdf',
    },
    {
      id: '12',
      name: 'Спецификация оборудования.xlsx',
      type: 'other',
      size: 156789,
      url: '/mock/documents/spec_0173200000124000001.xlsx',
    },
  ],
  '0372100000124000002': [
    {
      id: '13',
      name: 'Техническое задание капремонт.pdf',
      type: 'technical_specification',
      size: 4567890,
      url: '/mock/documents/tz_0372100000124000002.pdf',
    },
    {
      id: '14',
      name: 'Проект контракта.docx',
      type: 'draft_contract',
      size: 567890,
      url: '/mock/documents/contract_0372100000124000002.docx',
    },
    {
      id: '15',
      name: 'Проектная документация.pdf',
      type: 'other',
      size: 8901234,
      url: '/mock/documents/project_0372100000124000002.pdf',
    },
    {
      id: '16',
      name: 'Смета работ.xlsx',
      type: 'other',
      size: 234567,
      url: '/mock/documents/estimate_0372100000124000002.xlsx',
    },
  ],
  '32515400000124000003': [
    {
      id: '17',
      name: 'Техническое задание IT поддержка.pdf',
      type: 'technical_specification',
      size: 3456789,
      url: '/mock/documents/tz_32515400000124000003.pdf',
    },
    {
      id: '18',
      name: 'Проект контракта.pdf',
      type: 'draft_contract',
      size: 456789,
      url: '/mock/documents/contract_32515400000124000003.pdf',
    },
    {
      id: '19',
      name: 'Перечень программного обеспечения.xlsx',
      type: 'other',
      size: 123456,
      url: '/mock/documents/software_32515400000124000003.xlsx',
    },
    {
      id: '20',
      name: 'Требования к SLA.docx',
      type: 'other',
      size: 234567,
      url: '/mock/documents/sla_32515400000124000003.docx',
    },
  ],
};

/**
 * Эмуляция получения списка документов тендера из ЕИС
 * @param purchaseNumber - номер закупки
 * @returns массив документов
 */
export async function getTenderDocuments(
  purchaseNumber: string
): Promise<EISDocument[]> {
  // Эмуляция задержки сети
  const delay = Math.random() * 800 + 300;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const normalizedNumber = purchaseNumber.replace(/\s+/g, '').trim();
  return MOCK_DOCUMENTS[normalizedNumber] || [];
}

/**
 * Форматирование размера файла для отображения
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
