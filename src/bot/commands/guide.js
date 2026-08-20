const { smartReply, cb } = require('../../core/helpers');

module.exports = function registerGuide(bot) {
  bot.command('guide', async (ctx) => { await showGuide(ctx); });
  bot.action(/^guide\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showGuide(ctx); });

  bot.action(/^guide_page\|(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match[1]);
    await showGuide(ctx, page);
  });

  async function showGuide(ctx, page = 1) {
    const uid = ctx.from.id;
    const pages = {
      1: {
        title: '🎮 شروع بازی',
        content: `⚔️ *به EPWR خوش آمدی!*\n\n` +
          `📖 *چطوری شروع کنم؟*\n\n` +
          `1️⃣ از 🛒 فروشگاه یه قهرمان بخر\n` +
          `2️⃣ برو ⚔️ نبرد و سرزمین‌ها رو فتح کن\n` +
          `3️⃣ با سکه‌ها قوی‌تر شو!\n\n` +
          `💡 هر نبرد XP میده و لول آپ می‌شی!`
      },
      2: {
        title: '🍖 غذا و قهرمان‌ها',
        content: `🍖 *سیستم غذا*\n\n` +
          `هر قهرمان روزانه 10 غذا می‌خوره.\n\n` +
          `⚠️ *اگه غذا نداشته باشی:*\n` +
          `• قهرمان‌ها آسیب می‌بینن\n` +
          `• طی چند روز می‌میرن!\n\n` +
          `✅ *راه حل:*\n` +
          `• 🍳 آشپزخانه بساز تا غذا بپزه\n` +
          `• 🌾 مزرعه بساز تا ظرفیت غذا بالا بره\n` +
          `• از فروشگاه بسته غذا بخر`
      },
      3: {
        title: '🏗️ ساختمان‌ها',
        content: `🏗️ *ساختمان‌ها*\n\n` +
          `🏰 قلعه: دفاع +20% هر سطح\n` +
          `🏹 برج کمانداران: حمله +10% هر سطح\n` +
          `🌾 مزرعه: ظرفیت غذا +500 هر سطح\n` +
          `⚒️ آهنگری: قدرت قهرمانان +15% هر سطح\n` +
          `⚔️ پادگان: ظرفیت قهرمان +2 هر سطح\n` +
          `🍳 آشپزخانه: 20 غذا در روز هر سطح\n\n` +
          `💡 *ارتقا:* هر ساختمان رو می‌تونی تا حداکثر سطح ارتقا بدی!\n` +
          `💡 *هزینه ارتقا:* هر سطح 50% بیشتر از قبلی`
      },
      4: {
        title: '📦 منابع',
        content: `📦 *راهنمای منابع*\n\n` +
          `💰 *سکه:*\n` +
          `• جنگ با NPC و بازیکن‌ها\n` +
          `• دستگاه‌های سکه‌ساز\n` +
          `• مأموریت‌های روزانه\n\n` +
          `🪵 *چوب:*\n` +
          `• خرید از فروشگاه منابع\n\n` +
          `🪨 *سنگ:*\n` +
          `• خرید از فروشگاه منابع\n\n` +
          `⚙️ *آهن:*\n` +
          `• خرید از فروشگاه منابع\n\n` +
          `🍖 *غذا:*\n` +
          `• آشپزخانه (تولید روزانه)\n` +
          `• خرید از فروشگاه منابع`
      },
      5: {
        title: '⚔️ نبرد',
        content: `⚔️ *نبرد*\n\n` +
          `🎯 دو نوع جنگ:\n\n` +
          `1️⃣ *جنگ با NPC:* سرزمین‌های ربات\n` +
          `2️⃣ *جنگ PvP:* با بازیکن‌های واقعی\n\n` +
          `💡 *نکات:*\n` +
          `• قبل جنگ قهرمان انتخاب کن\n` +
          `• قدرت تیم مهمه\n` +
          `• اگه ببازی، قهرمان‌ها آسیب می‌بینن\n` +
          `• اگه خیلی آسیب ببینن، می‌میرن!`
      },
      6: {
        title: '💡 نکات مهم',
        content: `💡 *نکات طلایی*\n\n` +
          `🔔 اعلان‌ها رو چک کن تا از حملات باخبر بشی\n\n` +
          `📜 مأموریت‌های روزانه XP و سکه میدن\n\n` +
          `🤝 اتحاد بساز و با دوستانت بازی کن\n\n` +
          `🧲 معجون آهنربا سکه بیشتری میده\n\n` +
          `⚡ معجون قدرت رو قبل جنگ بزن\n\n` +
          `💉 معجون احیا قهرمان مرده رو زنده می‌کنه\n\n` +
          `🍳 آشپزخانه رو زودتر بساز!`
      }
    };

    const p = pages[page] || pages[1];
    let msg = `📚 *راهنما - ${p.title}*\n\n${p.content}`;

    const buttons = [];
    const navRow = [];
    if (page > 1) navRow.push({ text: '◀️ قبلی', callback_data: `guide_page|${page - 1}|${uid}` });
    navRow.push({ text: `${page}/6`, callback_data: `guide_page|${page}|${uid}` });
    if (page < 6) navRow.push({ text: 'بعدی ▶️', callback_data: `guide_page|${page + 1}|${uid}` });
    buttons.push(navRow);
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);

    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
module.exports.showGuide = showGuide;
};