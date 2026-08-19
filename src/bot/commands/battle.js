const { getOrCreatePlayer } = require('../../game/player');
const { findOpponent, executeBattle, getEquippedHero } = require('../../game/battle');
const { formatGold } = require('../../core/helpers');

module.exports = function registerBattle(bot) {

  // دستور /battle
  bot.command('battle', async (ctx) => {
    try { await startBattle(ctx); }
    catch (e) { ctx.reply('⚠️ خطا: ' + e.message); }
  });

  // دکمه نبرد
  bot.action('battle', async (ctx) => {
    await ctx.answerCbQuery();
    await startBattle(ctx);
  });

  async function startBattle(ctx) {
    const player = await getOrCreatePlayer(ctx.from);

    // بررسی قهرمان تجهیز شده
    const hero = await getEquippedHero(ctx.from.id);
    if (!hero) {
      return ctx.reply(
        `⚠️ *اول یک قهرمان تجهیز کن!*\n\nاز فروشگاه قهرمان بخر و دکمه "تجهیز کردن" رو بزن.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 رفتن به فروشگاه', callback_data: 'shop' }]
            ]
          }
        }
      );
    }

    // پیدا کردن حریف
    await ctx.reply(`🔍 در حال پیدا کردن حریف...`);

    const opponent = await findOpponent(ctx.from.id);
    if (!opponent) {
      return ctx.reply('⚠️ حریفی پیدا نشد! بعداً دوباره تلاش کن.');
    }

    // اجرای جنگ
    const result = await executeBattle(ctx.from.id, opponent.telegram_id);

    if (!result.success) {
      return ctx.reply(result.message);
    }

    // نمایش نتیجه
    const isAttackerWin = result.attackerWins;
    const emoji = isAttackerWin ? '🏆' : '💀';
    const title = isAttackerWin ? 'پیروزی!' : 'شکست!';

    let message = `⚔️ *نتیجه نبرد*\n\n`;
    message += `${emoji} *${title}*\n\n`;
    message += `👤 تو: ${player.commander_name} (قدرت: ${result.attackerPower})\n`;
    message += `🎯 حریف: ${opponent.commander_name} (قدرت: ${result.defenderPower})\n\n`;

    if (isAttackerWin) {
      message += `💰 *${result.goldStolen} Gold دزدیدی!*\n`;
      message += `🎉 تبریک!`;
    } else {
      message += `💰 *${result.goldStolen} Gold از دست دادی!*\n`;
      message += `😤 دفعه بعد انتقام می‌گیری!`;
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚔️ نبرد دوباره', callback_data: 'battle' }],
          [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
        ]
      }
    });
  }
};