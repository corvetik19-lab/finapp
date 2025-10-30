# 🤖 ФНС → Telegram → AI → Finappka — Полная автоматизация

## 🎯 Что это делает

```
1. Покупка в магазине
   ↓
2. ФНС бот присылает чек в Telegram
   ↓
3. Пересылаешь чек своему боту
   ↓
4. n8n получает сообщение
   ↓
5. Парсит чек (магазин, товары, суммы)
   ↓
6. AI (GPT-4o-mini) анализирует и категоризирует:
   - Молоко → Продукты
   - Бургер → Кафе/Рестораны
   - Аспирин → Здоровье
   ↓
7. Создаёт категории в Finappka (если нет)
   ↓
8. Создаёт транзакции с правильными категориями
   ↓
9. Отправляет подтверждение в Telegram

⏱️ Всё за 3-5 секунд!
```

---

## 📋 Что понадобится

### 1. Telegram бот
- ✅ Токен от @BotFather
- ✅ Ваш личный бот для пересылки чеков

### 2. OpenAI API ключ
- ✅ Для AI категоризации
- ✅ GPT-4o-mini (~$0.01 за 100 чеков)
- ✅ Минимум $5 на балансе

### 3. n8n Cloud
- ✅ У вас уже есть: https://domik1.app.n8n.cloud
- ✅ Бесплатно: 20,000 executions/месяц

### 4. Finappka
- ✅ Запущен: http://localhost:3000
- ✅ Нужен публичный URL (ngrok или деплой)

---

## 🚀 Шаг 1: Создай Telegram бота

### 1.1. Открой @BotFather в Telegram

### 1.2. Создай бота

```
/newbot
```

**Введи:**
- Имя: `Finappka FNS Bot`
- Username: `finappka_fns_bot` (должен быть уникальным, попробуй разные варианты)

### 1.3. Получи токен

```
Token: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

**✅ СОХРАНИ ТОКЕН!** Он понадобится для n8n.

### 1.4. Настрой описание (опционально)

```
/setdescription
Автоматический импорт чеков из ФНС в Finappka с AI категоризацией

/setabouttext
Пересылай сюда чеки от ФНС бота - они автоматически добавятся в твои расходы!
```

---

## 🔑 Шаг 2: Получи OpenAI API ключ

### 2.1. Зарегистрируйся

https://platform.openai.com/signup

### 2.2. Создай API ключ

1. Dashboard → API Keys
2. Create new secret key
3. Скопируй ключ: `sk-proj-abc123...`

**⚠️ СОХРАНИ! Показывается только один раз!**

### 2.3. Пополни баланс

https://platform.openai.com/account/billing

Минимум $5

**Стоимость:**
- GPT-4o-mini: $0.15 за 1M токенов
- 1 чек ≈ 500 токенов
- 100 чеков ≈ $0.01 (меньше 1 рубля!)

---

## 📡 Шаг 3: Настрой n8n Cloud

Я создам для вас упрощённый workflow. Вот что нужно сделать:

### 3.1. Создай Credentials

#### A. Telegram Bot Credential

1. Открой: https://domik1.app.n8n.cloud/home/credentials
2. **+ New Credential** → **Telegram API**
3. Заполни:
   ```
   Credential Name: FNS Bot
   Access Token: [ваш токен от BotFather]
   ```
4. **Save**

#### B. OpenAI Credential

1. **+ New Credential** → **OpenAI API**
2. Заполни:
   ```
   Credential Name: OpenAI
   API Key: sk-proj-[ваш ключ]
   ```
3. **Save**

#### C. Finappka API Credential

1. **+ New Credential** → **HTTP Header Auth**
2. Заполни:
   ```
   Credential Name: Finappka API
   Name: Authorization
   Value: Bearer [ваш Supabase anon key]
   ```
   
   **Где взять Supabase anon key:**
   - Supabase Dashboard → Settings → API
   - Скопируй `anon` `public` key

3. **Save**

---

## 🔨 Шаг 4: Создай Workflow

Вместо импорта JSON, я создам простую версию через UI:

### 4.1. Создай новый workflow

1. https://domik1.app.n8n.cloud/home/workflows
2. **Create Workflow**
3. Назови: `ФНС → AI → Finappka`

### 4.2. Добавь nodes (по порядку)

#### Node 1: Telegram Trigger

1. **Add first step** → **On app event**
2. Найди **Telegram Trigger**
3. Настрой:
   - **Credential**: FNS Bot
   - **Updates**: Message
4. **Execute Node** → должен показать webhook URL

#### Node 2: Code (Parse Receipt)

1. **+** → **Code**
2. Вставь код парсинга чека (см. ниже)

#### Node 3: IF (Valid Receipt?)

1. **+** → **IF**
2. Условие: `{{ $json.items_count }} > 0`

#### Node 4: OpenAI (AI Categorize)

1. **+** → **OpenAI**
2. Настрой:
   - **Credential**: OpenAI
   - **Resource**: Chat
   - **Model**: gpt-4o-mini
   - **Messages**: System + User (см. промпт ниже)

#### Node 5: Code (Parse AI Response)

1. **+** → **Code**
2. Парсинг JSON от AI

#### Node 6: HTTP Request (Create Transactions)

1. **+** → **HTTP Request**
2. Настрой:
   - **Method**: POST
   - **URL**: `https://ваш-ngrok-url.ngrok.io/api/receipts/import`
   - **Credential**: Finappka API
   - **Body**: JSON с данными чека

#### Node 7: Telegram (Send Success)

1. **+** → **Telegram**
2. Настрой:
   - **Credential**: FNS Bot
   - **Resource**: Message
   - **Operation**: Send Message
   - **Chat ID**: `{{ $json.message.chat.id }}`
   - **Text**: Подтверждение (см. ниже)

---

## 📝 Код для nodes

### Code Node 1: Parse Receipt

```javascript
// Извлекаем текст из Telegram сообщения
const message = $input.all()[0].json.message;
const text = message.text || '';

// Проверяем что это чек
if (!text.includes('кассовый чек') && !text.includes('Итого:')) {
  return [{ json: { items_count: 0, raw_text: text, message } }];
}

// Парсим магазин
let shopName = 'Магазин';
const shopMatch = text.match(/кассовый чек:\s*от\s+(.+?)\n/);
if (shopMatch) {
  shopName = shopMatch[1].trim().replace(/"/g, '');
}

// Парсим дату
let date = new Date().toISOString();
const dateMatch = text.match(/Дата:\s*(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
if (dateMatch) {
  date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T${dateMatch[4]}:${dateMatch[5]}:00Z`;
}

// Парсим итоговую сумму
let totalAmount = 0;
const totalMatch = text.match(/Итого:\s*([\d\s]+[.,]\d{2})/);
if (totalMatch) {
  totalAmount = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.'));
}

// Парсим товары
const items = [];
const lines = text.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  const itemMatch = line.match(/^(\d+)\.\s+(.+)$/);
  
  if (itemMatch && i + 1 < lines.length) {
    const itemName = itemMatch[2].trim();
    const nextLine = lines[i + 1].trim();
    const priceMatch = nextLine.match(/([\d\s]+[.,]\d{2})\s*x\s*[\d.,]+\s*=\s*([\d\s]+[.,]\d{2})/);
    
    if (priceMatch) {
      const price = parseFloat(priceMatch[2].replace(/\s/g, '').replace(',', '.'));
      items.push({ name: itemName, price });
    }
  }
}

return [{
  json: {
    shop_name: shopName,
    date,
    total_amount: totalAmount,
    items,
    items_count: items.length,
    raw_text: text,
    message
  }
}];
```

### OpenAI Prompt (System Message)

```
Ты - эксперт по категоризации покупок для личных финансов.

Твоя задача - распределить товары из чека по логическим категориям.

Доступные категории:
- Продукты (еда, напитки, продукты питания, супермаркет)
- Транспорт (такси, бензин, парковка, общественный транспорт, каршеринг)
- Развлечения (кино, игры, подписки, хобби, спорт, фитнес)
- Здоровье (аптека, лекарства, врачи, медицина, витамины)
- Одежда (одежда, обувь, аксессуары, украшения)
- Дом (мебель, техника, ремонт, коммуналка, бытовая химия)
- Образование (книги, курсы, обучение, канцелярия)
- Кафе/Рестораны (кафе, рестораны, фастфуд, доставка еды)
- Прочее (всё остальное)

Верни ТОЛЬКО валидный JSON без дополнительного текста:
{
  "items": [
    {
      "name": "название товара",
      "price": цена,
      "category": "категория"
    }
  ],
  "main_category": "основная категория для всего чека"
}

Логика:
- Если магазин = продуктовый (Пятёрочка, Магнит, Перекрёсток) → скорее всего Продукты
- Если магазин = ресторан/кафе (McDonald's, KFC, Burger King) → Кафе/Рестораны
- Если магазин = аптека → Здоровье
- Анализируй название товара для точной категоризации
```

### OpenAI Prompt (User Message)

```
Магазин: {{ $json.shop_name }}
Дата: {{ $json.date }}
Итого: {{ $json.total_amount }}₽

Товары:
{{ $json.items.map(item => `- ${item.name}: ${item.price}₽`).join('\n') }}

Распредели товары по категориям.
```

### Code Node 2: Parse AI Response

```javascript
const aiResponse = $input.all()[0].json.choices[0].message.content;
const originalData = $input.all()[0].json;

let categorizedData;
try {
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    categorizedData = JSON.parse(jsonMatch[0]);
  } else {
    throw new Error('No JSON');
  }
} catch (error) {
  categorizedData = {
    items: originalData.items.map(item => ({
      name: item.name,
      price: item.price,
      category: 'Прочее'
    })),
    main_category: 'Прочее'
  };
}

return [{
  json: {
    shop_name: originalData.shop_name,
    date: originalData.date,
    total_amount: originalData.total_amount,
    items: categorizedData.items,
    main_category: categorizedData.main_category,
    raw_text: originalData.raw_text,
    message: originalData.message
  }
}];
```

### Telegram Success Message

```
✅ Чек обработан!

🏪 Магазин: {{ $json.shop_name }}
💰 Сумма: {{ $json.total_amount }}₽
📁 Категория: {{ $json.main_category }}

📦 Товары:
{{ $json.items.map(item => `• ${item.name} - ${item.price}₽ (${item.category})`).join('\n') }}

✨ Транзакции созданы в Finappka!
```

---

## 🌐 Шаг 5: Сделай Finappka доступным из интернета

### Вариант A: ngrok (быстро)

```bash
# Установить ngrok
choco install ngrok

# Запустить туннель
ngrok http 3000

# Получишь URL: https://abc123.ngrok.io
```

### Вариант B: Деплой на Vercel/Railway

Задеплой Finappka на Vercel и используй production URL.

---

## 🔧 Шаг 6: Создай API endpoint в Finappka

Создай файл `app/api/receipts/import/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRSCClient } from '@/lib/supabase/helpers';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRSCClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { shop_name, date, total_amount, items, main_category } = body;

    // Получить workspace
    const { data: membership } = await supabase
      .from('WorkspaceMember')
      .select('workspaceId')
      .eq('userId', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    // Получить дефолтный счёт
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('workspace_id', membership.workspaceId)
      .limit(1)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'No account' }, { status: 400 });
    }

    // Создать/найти категорию
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('name', main_category)
      .eq('workspace_id', membership.workspaceId)
      .single();

    let categoryId = category?.id;

    if (!categoryId) {
      // Создать категорию
      const { data: newCategory } = await supabase
        .from('categories')
        .insert({
          workspace_id: membership.workspaceId,
          name: main_category,
          type: 'expense',
          icon: '🛒',
        })
        .select('id')
        .single();
      
      categoryId = newCategory?.id;
    }

    // Создать транзакции для каждого товара
    const transactions = items.map((item: any) => ({
      workspace_id: membership.workspaceId,
      account_id: account.id,
      category_id: categoryId,
      amount: Math.round(item.price * 100), // в копейках
      currency: 'RUB',
      direction: 'expense',
      occurred_at: date,
      note: `${item.name} (${shop_name})`,
      counterparty: shop_name,
    }));

    const { error } = await supabase
      .from('transactions')
      .insert(transactions);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: transactions.length });
  } catch (error) {
    console.error('Receipt import error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## ▶️ Шаг 7: Активируй workflow

1. В n8n нажми **Active** → ON
2. Workflow начнёт слушать Telegram

---

## 🧪 Шаг 8: Протестируй!

### 8.1. Получи чек от ФНС бота

Сделай покупку и получи чек от @ofd_receipt_bot

### 8.2. Перешли чек своему боту

1. Открой чат с вашим ботом
2. Перешли сообщение от ФНС бота
3. Жди 3-5 секунд

### 8.3. Получи подтверждение

Бот ответит с деталями чека и созданными транзакциями!

### 8.4. Проверь Finappka

Открой Транзакции — должны появиться новые записи с правильными категориями!

---

## 💡 Дополнительные возможности

### 1. Автоматическое создание категорий

AI создаст категорию, если её нет в Finappka

### 2. Умная категоризация

AI анализирует:
- Название товара
- Название магазина
- Контекст покупки

### 3. Групповые транзакции

Можно создать одну транзакцию с детализацией вместо нескольких

---

## ⚠️ Troubleshooting

### Бот не отвечает

1. ✅ Workflow активен?
2. ✅ Credentials настроены?
3. ✅ Telegram webhook зарегистрирован?

### Транзакции не создаются

1. ✅ Finappka доступен из интернета?
2. ✅ API endpoint создан?
3. ✅ Есть дефолтный account?
4. ✅ Проверь логи в n8n Executions

### AI неправильно категоризирует

- Улучши промпт
- Добавь примеры
- Используй GPT-4o (точнее, но дороже)

---

## 📚 Итого

✅ **Автоматический импорт** чеков из Telegram  
✅ **AI категоризация** с GPT-4o-mini  
✅ **Автосоздание категорий** в Finappka  
✅ **Мгновенная обработка** (3-5 сек)  
✅ **Подтверждение** в Telegram  

**Стоимость:** ~$0.01 за 100 чеков (меньше 1₽!)

---

**🎉 Готово! Теперь чеки импортируются автоматически с AI категоризацией! 🤖**
