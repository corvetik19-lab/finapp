import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  sendTelegramMessage,
  parseTelegramCommand,
  formatFinancialMessage,
  getQuickCommandsKeyboard,
  formatErrorMessage,
  answerCallbackQuery,
  editMessageText,
  type TelegramUpdate,
} from "@/lib/telegram/bot";
import { parseCommand, executeCommand } from "@/lib/ai/commands";

export const dynamic = "force-dynamic";

// Service client для работы с БД
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST - Webhook от Telegram
 */
export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
    }

    const update: TelegramUpdate = await request.json();
    console.log("Telegram update:", update);

    const supabase = getServiceClient();

    // Обрабатываем callback query (нажатие на кнопку)
    if (update.callback_query) {
      await handleCallbackQuery(botToken, update.callback_query, supabase);
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const telegramUserId = message.from.id;

    // Получаем пользователя по telegram_user_id
    const { data: userPrefs } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("telegram_user_id", telegramUserId.toString())
      .single();

    // Обрабатываем команды
    const { command, args } = parseTelegramCommand(text);

    // Если пользователь не привязан и это команда /start с кодом
    if (!userPrefs && command === "start" && args && args.length > 0) {
      await handleLinkAccount(botToken, chatId, telegramUserId, message.from.username, args[0], supabase);
      return NextResponse.json({ ok: true });
    }

    // Если пользователь не привязан
    if (!userPrefs) {
      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: formatErrorMessage(
          "❌ Ваш Telegram не привязан к аккаунту.\n\n" +
          "🔗 Чтобы привязать:\n" +
          "1. Откройте приложение FinApp\n" +
          "2. Перейдите в Настройки → Telegram\n" +
          "3. Сгенерируйте код привязки\n" +
          "4. Отправьте мне: /start ВАШ_КОД"
        ),
        parse_mode: "Markdown",
      });
      return NextResponse.json({ ok: true });
    }

    const userId = userPrefs.user_id;

    switch (command) {
      case "start":
        await handleStart(botToken, chatId);
        break;

      case "help":
        await handleHelp(botToken, chatId);
        break;

      case "balance":
        await handleBalance(botToken, chatId, supabase, userId);
        break;

      case "stats":
        await handleStats(botToken, chatId, supabase, userId);
        break;

      case "budgets":
        await handleBudgets(botToken, chatId, supabase, userId);
        break;

      case "add":
        await handleAdd(botToken, chatId, supabase, userId, args.join(" "));
        break;

      case "settings":
        await handleSettings(botToken, chatId, supabase, userId);
        break;

      default:
        // Пытаемся распарсить как естественную команду
        await handleNaturalCommand(botToken, chatId, supabase, userId, text);
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true }); // Всегда возвращаем ok чтобы Telegram не спамил
  }
}

async function handleStart(botToken: string, chatId: number) {
  await sendTelegramMessage(botToken, {
    chat_id: chatId,
    text: formatFinancialMessage({
      title: "🤖 Привет! Я ваш финансовый помощник",
      items: [
        { label: "📱", value: "Быстро добавляйте транзакции" },
        { label: "💰", value: "Проверяйте баланс" },
        { label: "📊", value: "Смотрите статистику" },
        { label: "🔔", value: "Получайте уведомления" },
      ],
      footer: "Используйте /help для списка команд",
    }),
    parse_mode: "Markdown",
    reply_markup: getQuickCommandsKeyboard(),
  });
}

async function handleHelp(botToken: string, chatId: number) {
  const helpText = `*📖 Доступные команды:*

/balance - Показать баланс всех счетов
/stats - Статистика трат за месяц
/budgets - Состояние бюджетов
/add <сумма> <категория> - Добавить расход
/settings - ⚙️ Настройки уведомлений
/help - Эта справка

*💬 Естественные команды:*
"Добавь 500р на кофе"
"Покажи баланс"
"Сколько я потратил?"

*🔗 Настройка:*
Привяжите Telegram в настройках приложения`;

  await sendTelegramMessage(botToken, {
    chat_id: chatId,
    text: helpText,
    parse_mode: "Markdown",
  });
}

async function handleBalance(
  botToken: string,
  chatId: number,
  supabase: SupabaseClient,
  userId: string
) {
  const { data: accounts } = await supabase
    .from("accounts")
    .select("name, balance, currency")
    .eq("user_id", userId);

  if (!accounts || accounts.length === 0) {
    await sendTelegramMessage(botToken, {
      chat_id: chatId,
      text: "У вас пока нет счетов",
    });
    return;
  }

  const total = accounts.reduce((sum: number, acc: { balance: number }) => sum + acc.balance, 0);

  await sendTelegramMessage(botToken, {
    chat_id: chatId,
    text: formatFinancialMessage({
      title: "💰 Ваш баланс",
      items: [
        ...accounts.map((acc: { name: string; balance: number }) => ({
          label: acc.name,
          value: formatMoney(acc.balance),
        })),
        { label: "\n*Итого*", value: formatMoney(total) },
      ],
    }),
    parse_mode: "Markdown",
  });
}

async function handleStats(
  botToken: string,
  chatId: number,
  supabase: SupabaseClient,
  userId: string
) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, direction")
    .eq("user_id", userId)
    .gte("date", oneMonthAgo.toISOString().split("T")[0]);

  if (!transactions || transactions.length === 0) {
    await sendTelegramMessage(botToken, {
      chat_id: chatId,
      text: "За последний месяц нет транзакций",
    });
    return;
  }

  const income = transactions
    .filter((t: { direction: string }) => t.direction === "income")
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  const expense = transactions
    .filter((t: { direction: string }) => t.direction === "expense")
    .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  await sendTelegramMessage(botToken, {
    chat_id: chatId,
    text: formatFinancialMessage({
      title: "📊 Статистика за месяц",
      items: [
        { label: "Доходы", value: formatMoney(income) },
        { label: "Расходы", value: formatMoney(expense) },
        { label: "*Баланс*", value: formatMoney(income - expense) },
        { label: "Транзакций", value: transactions.length.toString() },
      ],
    }),
    parse_mode: "Markdown",
  });
}

async function handleBudgets(
  botToken: string,
  chatId: number,
  supabase: SupabaseClient,
  userId: string
) {
  const { data: budgets } = await supabase
    .from("budgets")
    .select("amount, spent, categories(name)")
    .eq("user_id", userId);

  if (!budgets || budgets.length === 0) {
    await sendTelegramMessage(botToken, {
      chat_id: chatId,
      text: "У вас пока нет бюджетов",
    });
    return;
  }

  const items = budgets.map((b: { spent: number; amount: number; categories?: { name: string } | { name: string }[] | null }) => {
    const percentage = (b.spent / b.amount) * 100;
    const emoji = percentage >= 100 ? "❌" : percentage >= 80 ? "⚠️" : "✅";
    return {
      label: `${emoji} ${Array.isArray(b.categories) ? b.categories[0]?.name : b.categories?.name || "Без категории"}`,
      value: `${formatMoney(b.spent)} / ${formatMoney(b.amount)} (${percentage.toFixed(0)}%)`,
    };
  });

  await sendTelegramMessage(botToken, {
    chat_id: chatId,
    text: formatFinancialMessage({
      title: "🎯 Ваши бюджеты",
      items,
    }),
    parse_mode: "Markdown",
  });
}

async function handleAdd(
  botToken: string,
  chatId: number,
  supabase: SupabaseClient,
  userId: string,
  commandText: string
) {
  if (!commandText) {
    await sendTelegramMessage(botToken, {
      chat_id: chatId,
      text: "Использование: /add <сумма> <категория>\nПример: /add 500 кофе",
    });
    return;
  }

  // Используем парсер команд
  const parsed = await parseCommand(`Добавь ${commandText}`);
  const result = await executeCommand(parsed, supabase, userId);

  await sendTelegramMessage(botToken, {
    chat_id: chatId,
    text: result.message,
    parse_mode: "Markdown",
  });
}

async function handleNaturalCommand(
  botToken: string,
  chatId: number,
  supabase: SupabaseClient,
  userId: string,
  text: string
) {
  const parsed = await parseCommand(text);

  if (parsed.type === "unknown" || parsed.confidence < 50) {
    await sendTelegramMessage(botToken, {
      chat_id: chatId,
      text: formatErrorMessage(
        "Команда не распознана.\n\n" + (parsed.suggestion || "Используйте /help")
      ),
      parse_mode: "Markdown",
    });
    return;
  }

  const result = await executeCommand(parsed, supabase, userId);

  await sendTelegramMessage(botToken, {
    chat_id: chatId,
    text: result.message,
    parse_mode: "Markdown",
  });
}

async function handleLinkAccount(
  botToken: string,
  chatId: number,
  telegramUserId: number,
  telegramUsername: string | undefined,
  code: string,
  supabase: SupabaseClient
) {
  try {
    // Ищем код в базе
    const { data: linkCode } = await supabase
      .from("telegram_link_codes")
      .select("user_id, expires_at, used_at")
      .eq("code", code.toUpperCase())
      .single();

    if (!linkCode) {
      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: formatErrorMessage(
          "❌ Неверный код привязки.\n\n" +
          "Убедитесь, что вы правильно ввели код из приложения."
        ),
      });
      return;
    }

    // Проверяем срок действия
    if (new Date(linkCode.expires_at) < new Date()) {
      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: formatErrorMessage(
          "❌ Код истёк.\n\n" +
          "Сгенерируйте новый код в приложении."
        ),
      });
      return;
    }

    // Проверяем, не использован ли код
    if (linkCode.used_at) {
      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: formatErrorMessage(
          "❌ Код уже использован.\n\n" +
          "Сгенерируйте новый код в приложении."
        ),
      });
      return;
    }

    // Привязываем аккаунт (UPSERT - создаём если нет)
    const { error: upsertError } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: linkCode.user_id,
        telegram_user_id: telegramUserId.toString(),
        telegram_username: telegramUsername || null,
        telegram_chat_id: chatId,
        telegram_linked_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (upsertError) throw upsertError;

    // Отмечаем код как использованный
    await supabase
      .from("telegram_link_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code.toUpperCase());

    await sendTelegramMessage(botToken, {
      chat_id: chatId,
      text: "✅ Аккаунт успешно привязан!\n\n" +
        "Теперь вы можете использовать бота для управления финансами.\n\n" +
        "Доступные команды:\n" +
        "/balance - показать баланс\n" +
        "/stats - статистика за месяц\n" +
        "/budgets - состояние бюджетов\n" +
        "/add 500 кофе - добавить расход\n\n" +
        "Также поддерживаются естественные команды, например:\n" +
        "\"Покажи баланс\" или \"Добавь 1000р на продукты\"",
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Link account error:", error);
    await sendTelegramMessage(botToken, {
      chat_id: chatId,
      text: formatErrorMessage("Ошибка при привязке аккаунта. Попробуйте позже."),
    });
  }
}

/**
 * Показать настройки уведомлений
 */
async function handleSettings(
  botToken: string,
  chatId: number,
  supabase: SupabaseClient,
  userId: string
) {
  const { data: settings } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!settings) {
    await sendTelegramMessage(botToken, {
      chat_id: chatId,
      text: "Настройки не найдены",
    });
    return;
  }

  const emoji = (enabled: boolean) => (enabled ? "✅" : "❌");
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const selectedDays = (settings.schedule_days || [])
    .map((d: number) => days[d - 1])
    .join(", ");

  const text = `⚙️ *Настройки уведомлений*\n\n` +
    `📱 *Telegram:* ${emoji(settings.telegram_enabled)}\n` +
    `⏰ *Расписание:* ${emoji(settings.schedule_enabled)}\n` +
    `🕐 *Время:* ${settings.schedule_time || "09:00"}\n` +
    `📅 *Дни:* ${selectedDays || "Все"}\n\n` +
    `*Типы уведомлений:*\n` +
    `${emoji(settings.overspend_alerts)} Превышение трат\n` +
    `${emoji(settings.budget_warnings)} Бюджеты\n` +
    `${emoji(settings.missing_transaction_reminders)} Напоминания\n` +
    `${emoji(settings.upcoming_payment_reminders)} Платежи\n` +
    `${emoji(settings.ai_insights)} AI инсайты\n` +
    `${emoji(settings.ai_recommendations)} AI рекомендации`;

  await sendTelegramMessage(botToken, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: settings.telegram_enabled ? "🔕 Telegram OFF" : "🔔 Telegram ON", callback_data: "toggle_telegram" },
          { text: settings.schedule_enabled ? "⏰ Расписание OFF" : "⏰ Расписание ON", callback_data: "toggle_schedule" },
        ],
        [
          { text: settings.overspend_alerts ? "💰 Траты OFF" : "💰 Траты ON", callback_data: "toggle_spending" },
          { text: settings.budget_warnings ? "🎯 Бюджеты OFF" : "🎯 Бюджеты ON", callback_data: "toggle_budgets" },
        ],
        [
          { text: settings.missing_transaction_reminders ? "📝 Напоминания OFF" : "📝 Напоминания ON", callback_data: "toggle_reminders" },
          { text: settings.upcoming_payment_reminders ? "💳 Платежи OFF" : "💳 Платежи ON", callback_data: "toggle_payments" },
        ],
        [
          { text: settings.ai_insights ? "🤖 AI Инсайты OFF" : "🤖 AI Инсайты ON", callback_data: "toggle_insights" },
          { text: settings.ai_recommendations ? "💡 AI Рекомендации OFF" : "💡 AI Рекомендации ON", callback_data: "toggle_recommendations" },
        ],
        [
          { text: "🌐 Открыть в приложении", callback_data: "open_web" },
        ],
      ],
    },
  });
}

/**
 * Обработка нажатий на кнопки
 */
async function handleCallbackQuery(
  botToken: string,
  query: NonNullable<TelegramUpdate["callback_query"]>,
  supabase: SupabaseClient
) {
  const callbackData = query.data;
  const telegramUserId = query.from.id;
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;

  if (!callbackData || !chatId || !messageId) {
    await answerCallbackQuery(botToken, query.id, "Ошибка", true);
    return;
  }

  // Получаем пользователя
  const { data: userPrefs } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("telegram_user_id", telegramUserId.toString())
    .single();

  if (!userPrefs) {
    await answerCallbackQuery(botToken, query.id, "Telegram не привязан", true);
    return;
  }

  const userId = userPrefs.user_id;

  // Обрабатываем действия
  if (callbackData === "open_web") {
    await answerCallbackQuery(
      botToken,
      query.id,
      "Откройте приложение для детальных настроек",
      true
    );
    return;
  }

  // Маппинг кнопок на поля БД
  const fieldMap: Record<string, string> = {
    toggle_telegram: "telegram_enabled",
    toggle_schedule: "schedule_enabled",
    toggle_spending: "overspend_alerts",
    toggle_budgets: "budget_warnings",
    toggle_reminders: "missing_transaction_reminders",
    toggle_payments: "upcoming_payment_reminders",
    toggle_insights: "ai_insights",
    toggle_recommendations: "ai_recommendations",
  };

  const field = fieldMap[callbackData];
  if (!field) {
    await answerCallbackQuery(botToken, query.id, "Неизвестная команда");
    return;
  }

  // Получаем текущие настройки
  const { data: currentSettings } = await supabase
    .from("notification_preferences")
    .select(field)
    .eq("user_id", userId)
    .single();

  if (!currentSettings) {
    await answerCallbackQuery(botToken, query.id, "Ошибка загрузки", true);
    return;
  }

  // Переключаем значение
  const newValue = !currentSettings[field as keyof typeof currentSettings];

  const { error } = await supabase
    .from("notification_preferences")
    .update({ [field]: newValue })
    .eq("user_id", userId);

  if (error) {
    await answerCallbackQuery(botToken, query.id, "Ошибка сохранения", true);
    return;
  }

  // Обновляем сообщение
  const { data: updatedSettings } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (updatedSettings) {
    const emoji = (enabled: boolean) => (enabled ? "✅" : "❌");
    const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    const selectedDays = (updatedSettings.schedule_days || [])
      .map((d: number) => days[d - 1])
      .join(", ");

    const text = `⚙️ *Настройки уведомлений*\n\n` +
      `📱 *Telegram:* ${emoji(updatedSettings.telegram_enabled)}\n` +
      `⏰ *Расписание:* ${emoji(updatedSettings.schedule_enabled)}\n` +
      `🕐 *Время:* ${updatedSettings.schedule_time || "09:00"}\n` +
      `📅 *Дни:* ${selectedDays || "Все"}\n\n` +
      `*Типы уведомлений:*\n` +
      `${emoji(updatedSettings.overspend_alerts)} Превышение трат\n` +
      `${emoji(updatedSettings.budget_warnings)} Бюджеты\n` +
      `${emoji(updatedSettings.missing_transaction_reminders)} Напоминания\n` +
      `${emoji(updatedSettings.upcoming_payment_reminders)} Платежи\n` +
      `${emoji(updatedSettings.ai_insights)} AI инсайты\n` +
      `${emoji(updatedSettings.ai_recommendations)} AI рекомендации`;

    await editMessageText(botToken, chatId, messageId, text, {
      inline_keyboard: [
        [
          { text: updatedSettings.telegram_enabled ? "🔕 Telegram OFF" : "🔔 Telegram ON", callback_data: "toggle_telegram" },
          { text: updatedSettings.schedule_enabled ? "⏰ Расписание OFF" : "⏰ Расписание ON", callback_data: "toggle_schedule" },
        ],
        [
          { text: updatedSettings.overspend_alerts ? "💰 Траты OFF" : "💰 Траты ON", callback_data: "toggle_spending" },
          { text: updatedSettings.budget_warnings ? "🎯 Бюджеты OFF" : "🎯 Бюджеты ON", callback_data: "toggle_budgets" },
        ],
        [
          { text: updatedSettings.missing_transaction_reminders ? "📝 Напоминания OFF" : "📝 Напоминания ON", callback_data: "toggle_reminders" },
          { text: updatedSettings.upcoming_payment_reminders ? "💳 Платежи OFF" : "💳 Платежи ON", callback_data: "toggle_payments" },
        ],
        [
          { text: updatedSettings.ai_insights ? "🤖 AI Инсайты OFF" : "🤖 AI Инсайты ON", callback_data: "toggle_insights" },
          { text: updatedSettings.ai_recommendations ? "💡 AI Рекомендации OFF" : "💡 AI Рекомендации ON", callback_data: "toggle_recommendations" },
        ],
        [
          { text: "🌐 Открыть в приложении", callback_data: "open_web" },
        ],
      ],
    });
  }

  await answerCallbackQuery(botToken, query.id, newValue ? "✅ Включено" : "❌ Выключено");
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}
