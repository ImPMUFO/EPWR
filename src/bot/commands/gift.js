const { redeemGiftCode } = require('../../game/gift');
const { formatGold, reply, cb } = require('../../core/helpers');

const giftState = new Map();

module.exports = function registerGift(bot) {
  bot.command('gift', async (ctx) => { await showGiftMenu(ctx); });
  bot.action(/^gift\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showGiftMenu(ctx); });

  bot.action(/^gift_enter_code\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    giftState.set(ctx.from.id, 'enter_code');
    await ctx.editMessageText('🎁 *کد هدیه*\n\nکد رو تایپ کن:', { reply_markup: { inline_keyboard: [[{ text: '❌', callback_data: cb('gift', ctx.from.id) }]] } });
  });

  bot.on('text', async (ctx, next) => {
    const state = giftState.get(ctx.from.id);
    if (!state) return next();
    if (ctx.message.text.startsWith('/')) {
      giftState.delete(ctx.from.id);
      return next();
    }
    giftState.delete(ctx.from.id);
    const result = await redeemGiftCode(ctx.from.id, ctx.message.text.trim());
    await ctx.reply(result.success ? `🎉 +${formatGold(result.gold)}💰 +${result.gems}💎` : result.message);
  });

  async function showGiftMenu(ctx) {
    giftState.delete(ctx.from.id);
    await reply(ctx, '🎁 *کد هدیه*\n\nکد داری؟ واردش کن!', { reply_markup: { inline_keyboard: [[{ text: '📝 وارد کردن کد', callback_data: cb('gift_enter_code', ctx.from.id) }], [{ text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]] } });
  }
};