import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  sendTelegramMessage,
  parseTelegramCommand,
  formatFinancialMessage,
  getQuickCommandsKeyboard,
  formatErrorMessage,
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

    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const telegramUserId = message.from.id;

    // Получаем пользователя по telegram_user_id
    const supabase = getServiceClient();
    const { data: userPrefs } = await supabase
      .from("notification_preferences")
      .select("user_id")
      .eq("telegram_user_id", telegramUserId.toString())
      .single();

    // Если пользователь не привязан
    if (!userPrefs) {
      await sendTelegramMessage(botToken, {
        chat_id: chatId,
        text: formatErrorMessage(
          "Ваш Telegram не привязан к аккаунту.\n\nЧтобы привязать:\n1. Войдите в приложение\n2. Перейдите в Настройки\n3. Введите ваш Telegram ID: `" +
            telegramUserId +
            "`"
        ),
        parse_mode: "Markdown",
      });
      return NextResponse.json({ ok: true });
    }

    const userId = userPrefs.user_id;

    // Обрабатываем команды
    const { command, args } = parseTelegramCommand(text);

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

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
  }).format(amount / 100);
}
