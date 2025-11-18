import * as dotenv from 'dotenv';
import * as path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { toolHandlers } from '../lib/ai/tool-handlers';

const receiptText = `Поступил кассовый чек: от ООО "ПРЕМИУМ" 
Дата:  07.11.2025 19:06
ИНН:  7810350863

1. Онигири Фуджи с Креветкой 120г
89.99 x 2.0 = 179.98 руб.

2. Батончик Корнлайн кокос 30г
16.99 x 1.0 = 16.99 руб.

3. Жевательная резинка Ментос мята свежая 
39.99 x 1.0 = 39.99 руб.

Итого:  236.96 руб.
Наличные:  0.00 руб.
Безналичные:  236.96 руб.`;

async function testReceiptProcessing() {
  console.log('📄 Тестируем обработку чека...\n');
  
  const userId = '94bb6cd5-3b0b-48a2-b904-b070ba28a38b'; // Из предыдущего скрипта
  
  try {
    const result = await toolHandlers.processReceipt({
      receiptText,
      userId,
      accountName: undefined,
    });
    
    console.log('\n✅ Результат обработки:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Ошибка:', error);
  }
}

testReceiptProcessing().catch(console.error);
