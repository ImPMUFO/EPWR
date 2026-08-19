const { redeemGiftCode } = require('../../game/gift');
const { formatGold } = require('../../core/helpers');

module.exports = function registerGift(bot) {

  bot.command('gift', async (ctx) => {
    await showGiftMenu(ctx);
  });

  bot.action('gift', async (ctx) => {
    await ctx.answerCbQuery();
    await showGiftMenu(ctx);
  });

  bot.action('gift_enter_code', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `🎁 *وارد کردن کد هدیه*\n\nلطفاً کد هدیه خود را تایپ کنید:\n\n📝 مثال: \`EPWR2026\``,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'gift' }]] }
      }
    );
  });

  // دریافت کد هدیه از کاربر
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    // اگه متن کوتاهه و شبیه کد هدیه‌ست
    if (text.length >= 3 && text.length <= 30 && !text.includes(' ')) {
      const result = await redeemGiftCode(ctx.from.id, text);
      if (result.success) {
        await ctx.reply(
          `🎉 *کد هدیه فعال شد!*\n\n` +
          `💰 سکه دریافتی: +${formatGold(result.gold)}\n` +
          `💎 الماس دریافتی: +${result.gems}\n\n` +
          `مبارک باشه! 🥳`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(result.message);
      }
      return;
    }
    return next();
  });

  async function showGiftMenu(ctx) {
    await ctx.reply(
      `🎁 *کد هدیه*\n\nکد هدیه دارید؟ اینجا واردش کنید و جوایزتون رو بگیرید!`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 وارد کردن کد هدیه', callback_data: 'gift_enter_code' }],
            [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
          ]
        }
      }
    );
  }
};