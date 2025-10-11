/**
 * Telegram Bot Integration
 * Webhook-based bot для уведомлений и быстрых команд
 */

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

export interface TelegramMessage {
  chat_id: number;
  text: string;
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: {
    inline_keyboard?: Array<Array<{ text: string; callback_data: string }>>;
    keyboard?: Array<Array<{ text: string }>>;
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
  };
}

/**
 * Отправка сообщения в Telegram
 */
export async function sendTelegramMessage(
  botToken: string,
  message: TelegramMessage
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Telegram send error:", error);
    return false;
  }
}

/**
 * Установка webhook
 */
export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Telegram webhook setup error:", error);
    return false;
  }
}

/**
 * Получение информации о боте
 */
export async function getTelegramBotInfo(botToken: string): Promise<{
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
} | null> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`
    );
    return await response.json();
  } catch (error) {
    console.error("Telegram bot info error:", error);
    return null;
  }
}

/**
 * Парсинг команд Telegram
 */
export function parseTelegramCommand(text: string): {
  command: string;
  args: string[];
} {
  const parts = text.trim().split(/\s+/);
  const command = parts[0].toLowerCase().replace("/", "");
  const args = parts.slice(1);

  return { command, args };
}

/**
 * Форматирование финансового сообщения
 */
export function formatFinancialMessage(data: {
  title: string;
  items: { label: string; value: string }[];
  footer?: string;
}): string {
  let message = `*${data.title}*\n\n`;

  data.items.forEach((item) => {
    message += `${item.label}: *${item.value}*\n`;
  });

  if (data.footer) {
    message += `\n_${data.footer}_`;
  }

  return message;
}

/**
 * Keyboard разметка для быстрых команд
 */
export function getQuickCommandsKeyboard() {
  return {
    keyboard: [
      [{ text: "/balance" }, { text: "/stats" }],
      [{ text: "/add" }, { text: "/budgets" }],
      [{ text: "/help" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

/**
 * Форматирование ошибки
 */
export function formatErrorMessage(error: string): string {
  return `❌ *Ошибка*\n\n${error}\n\nИспользуйте /help для справки.`;
}
