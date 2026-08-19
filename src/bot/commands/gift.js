const { redeemGiftCode } = require('../../game/gift');
const { formatGold, reply, cb } = require('../../core/helpers');

const giftState = new Map();

module.exports = function registerGift(bot) {

  bot.command('gift', async (ctx) => { await showGiftMenu(ctx); });
  bot.action(/gift:uid:(\d+)/, async (ctx) => { await ctx.answerCbQuery(); await showGiftMenu(ctx); });

  bot.action(/gift_enter_code:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    giftState.set(ctx.from.id, 'enter_code');
    await ctx.editMessageText(
      `🎁 *کد هدیه*\n\nکد رو تایپ کن:`,
      { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '❌ لغو', callback_data: cb('gift', ctx.from.id) }]] } }
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
      await ctx.reply(`🎉 کد فعال شد!\n💰 +${formatGold(result.gold)} | 💎 +${result.gems}`);
    } else {
      await ctx.reply(result.message);
    }
  });

  async function showGiftMenu(ctx) {
    giftState.delete(ctx.from.id);
    await reply(ctx, `🎁 *کد هدیه*\n\nکد داری؟ واردش کن!`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 وارد کردن کد', callback_data: cb('gift_enter_code', ctx.from.id) }],
          [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', ctx.from.id) }]
        ]
      }
    });
  }
};