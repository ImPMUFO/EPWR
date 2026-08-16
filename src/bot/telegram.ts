import { env } from "../config/env.js";

type TelegramResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

export async function telegramApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramResponse<T>> {
  const response = await fetch(
    `https://api.telegram.org/bot${env.telegramBotToken}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return (await response.json()) as TelegramResponse<T>;
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  return telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export const mainMenu = {
  inline_keyboard: [
    [
      { text: "🏰 قلمرو من", callback_data: "realm" },
      { text: "⚔️ ارتش من", callback_data: "army" },
    ],
    [
      { text: "💰 منابع", callback_data: "resources" },
      { text: "🗺️ جهان", callback_data: "world" },
    ],
    [
      { text: "🏆 رتبه‌بندی", callback_data: "ranking" },
      { text: "⚙️ تنظیمات", callback_data: "settings" },
    ],
  ],
};
