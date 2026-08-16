import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createNewPlayer } from "../src/game/player.js";
import { mainMenu, sendMessage, telegramApi } from "../src/bot/telegram.js";

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

// Temporary in-memory store for the first prototype.
// We will replace this with Supabase before adding real progression.
const players = new Map<number, ReturnType<typeof createNewPlayer>>();

function welcomeText(firstName: string) {
  return [
    "⚔️ <b>EPWR | نبرد حماسی</b> 💎",
    "",
    `سلام <b>${escapeHtml(firstName)}</b>!`,
    "به سرزمین قدرت‌ها، جنگ‌ها و قلمروها خوش آمدی.",
    "",
    "👑 در EPWR فرمانده یک قلمرو هستی.",
    "⚔️ ارتش بساز،",
    "💰 منابع جمع کن،",
    "🏰 قلمروت را توسعه بده،",
    "🗺️ و برای تبدیل شدن به یک قدرت بزرگ بجنگ.",
    "",
    "<i>ماجراجویی تو از همین‌جا شروع می‌شود.</i>",
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function handleUpdate(update: TelegramUpdate) {
  if (update.message?.text) {
    const message = update.message;
    const from = message.from;
    if (!from) return;

    if (message.text.startsWith("/start")) {
      let player = players.get(from.id);

      if (!player) {
        player = createNewPlayer({
          telegramId: from.id,
          username: from.username,
          firstName: from.first_name ?? "فرمانده",
        });
        players.set(from.id, player);
      }

      await sendMessage(message.chat.id, welcomeText(player.firstName), mainMenu);
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

  const chatId = callback.message.chat.id;
  const userId = callback.from.id;
  const player = players.get(userId);

  await telegramApi("answerCallbackQuery", {
    callback_query_id: callback.id,
  });

  if (!player) {
    await sendMessage(chatId, "ابتدا با /start وارد بازی شو.");
    return;
  }

  const responses: Record<string, string> = {
    realm:
      `🏰 <b>قلمرو من</b>\n\n👑 فرمانده: ${escapeHtml(player.commanderName)}\n🏰 قلمرو: ${escapeHtml(player.realmName)}\n⭐ سطح: ${player.level}`,
    army:
      "⚔️ <b>ارتش من</b>\n\nهنوز ارتشی تشکیل نداده‌ای.\nبه‌زودی نخستین نیروهایت را استخدام می‌کنیم.",
    resources:
      `💰 <b>منابع</b>\n\n🪙 طلا: ${player.gold}\n💎 الماس: ${player.gems}`,
    world:
      "🗺️ <b>جهان EPWR</b>\n\nنقشه جهان در مرحله بعدی ساخته می‌شود.",
    ranking:
      "🏆 <b>رتبه‌بندی</b>\n\nهنوز رقابت آغاز نشده است.",
    settings:
      "⚙️ <b>تنظیمات</b>\n\nتنظیمات فرمانده در نسخه بعدی اضافه می‌شود.",
  };

  await sendMessage(
    chatId,
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
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    await handleUpdate(req.body as TelegramUpdate);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("EPWR webhook error:", error);
    res.status(500).json({ ok: false });
  }
}
