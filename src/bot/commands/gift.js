const { redeemGiftCode } = require('../../game/gift');
const { formatGold } = require('../../core/helpers');

// State برای کاربران عادی
const giftState = new Map();

module.exports = function registerGift(bot) {

  bot.command('gift', async (ctx) => { await showGiftMenu(ctx); });
  bot.action('gift', async (ctx) => { await ctx.answerCbQuery(); await showGiftMenu(ctx); });

  bot.action('gift_enter_code', async (ctx) => {
    await ctx.answerCbQuery();
    giftState.set(ctx.from.id, 'enter_code');
    await ctx.editMessageText(
      `🎁 *وارد کردن کد هدیه*\n\nلطفاً کد هدیه خود را تایپ کنید:\n\n📝 مثال: \`EPWR2026\`\n\n⚠️ الان منتظر کد هستم...`,
      {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: 'gift' }]] }
      }
    );
  });

  bot.on('text', async (ctx, next) => {
    const state = giftState.get(ctx.from.id);
    if (!state) return next();
    
    const text = ctx.message.text;
    if (text.startsWith('/')) {
      giftState.delete(ctx.from.id);
      return next();
    }

    giftState.delete(ctx.from.id);
    
    const result = await redeemGiftCode(ctx.from.id, text.trim());
    if (result.success) {
      await ctx.reply(
        `🎉 *کد هدیه فعال شد!*\n\n💰 سکه دریافتی: +${formatGold(result.gold)}\n💎 الماس دریافتی: +${result.gems}\n\nمبارک باشه! 🥳`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(result.message);
    }
  });

  async function showGiftMenu(ctx) {
    giftState.delete(ctx.from.id);
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