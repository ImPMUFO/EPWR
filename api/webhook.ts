import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../src/database/supabase.js";
import { sendMessage, mainMenu, telegramApi } from "../src/bot/telegram.js";

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
};

type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getOrCreatePlayer(user: TelegramUser) {
  const { data: existingPlayer, error: findError } = await supabase
    .from("players")
    .select("*")
    .eq("telegram_id", user.id)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (existingPlayer) {
    return existingPlayer;
  }

  const { data: newPlayer, error: insertError } = await supabase
    .from("players")
    .insert({
      telegram_id: user.id,
      telegram_username: user.username ?? null,
      first_name: user.first_name ?? "فرمانده",
      commander_name: user.first_name ?? "فرمانده",
      realm_name: "قلمرو نوپا",
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return newPlayer;
}

function welcomeText(player: any) {
  return [
    "⚔️ <b>EPWR | نبرد حماسی</b> 💎",
    "",
    `سلام <b>${escapeHtml(player.first_name)}</b>!`,
    "",
    "به سرزمین قدرت‌ها، جنگ‌ها و قلمروها خوش آمدی.",
    "",
    `👑 فرمانده: <b>${escapeHtml(player.commander_name)}</b>`,
    `🏰 قلمرو: <b>${escapeHtml(player.realm_name)}</b>`,
    `⭐ سطح: <b>${player.level}</b>`,
    "",
    "از منوی زیر ماجراجویی خودت را شروع کن.",
  ].join("\n");
}

async function handleUpdate(update: TelegramUpdate) {
  if (update.message?.text) {
    const message = update.message;
    const user = message.from;

    if (!user) return;

    if (message.text.startsWith("/start")) {
      const player = await getOrCreatePlayer(user);

      await sendMessage(
        message.chat.id,
        welcomeText(player),
        mainMenu,
      );

      return;
    }

    await sendMessage(
      message.chat.id,
      "⚔️ برای شروع بازی از دستور <b>/start</b> استفاده کن.",
      mainMenu,
    );

    return;
  }

  const callback = update.callback_query;

  if (!callback?.message) return;

  const player = await getOrCreatePlayer(callback.from);

  await telegramApi("answerCallbackQuery", {
    callback_query_id: callback.id,
  });

  const responses: Record<string, string> = {
    realm:
      `🏰 <b>قلمرو من</b>\n\n` +
      `👑 فرمانده: ${escapeHtml(player.commander_name)}\n` +
      `🏰 قلمرو: ${escapeHtml(player.realm_name)}\n` +
      `⭐ سطح: ${player.level}`,

    army:
      "⚔️ <b>ارتش من</b>\n\nهنوز ارتشی تشکیل نداده‌ای.",

    resources:
      `💰 <b>منابع</b>\n\n🪙 طلا: ${player.gold}\n💎 الماس: ${player.gems}`,

    world:
      "🗺️ <b>جهان EPWR</b>\n\nنقشه جهان به‌زودی ساخته می‌شود.",

    ranking:
      "🏆 <b>رتبه‌بندی</b>\n\nرقابت فرماندهان به‌زودی آغاز می‌شود.",

    settings:
      "⚙️ <b>تنظیمات</b>\n\nتنظیمات فرمانده در نسخه بعدی اضافه می‌شود.",
  };

  await sendMessage(
    callback.message.chat.id,
    responses[callback.data ?? ""] ?? "دستور ناشناخته است.",
    mainMenu,
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== "POST") {
    res.status(200).json({
      ok: true,
      service: "EPWR Telegram Bot",
      message: "EPWR is alive ⚔️",
    });
    return;
  }

  const secret = req.headers["x-telegram-bot-api-secret-token"];

  if (
    process.env.TELEGRAM_WEBHOOK_SECRET &&
    secret !== process.env.TELEGRAM_WEBHOOK_SECRET
  ) {
    res.status(401).json({
      ok: false,
      error: "Unauthorized",
    });

    return;
  }

  try {
    await handleUpdate(req.body as TelegramUpdate);

    res.status(200).json({
      ok: true,
    });
  } catch (error) {
    console.error("EPWR webhook error:", error);

    res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}