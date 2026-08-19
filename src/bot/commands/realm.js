const { getOrCreatePlayer } = require('../../game/player');
const { collectGold } = require('../../game/realm');
const { getSupabase } = require('../../core/supabase');
const { formatGold, reply, cb } = require('../../core/helpers');

module.exports = function registerRealm(bot) {

  bot.action(/realm:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const db = getSupabase();
    const uid = ctx.from.id;

    const { data: devices } = await db
      .from('player_items')
      .select('id, item:shop_items (name, effect_value, type), is_active')
      .eq('telegram_id', ctx.from.id)
      .eq('is_active', true);

    let msg = `🏰 *قلمرو: ${player.realm_name}*\n\n`;
    msg += `⭐ Lv.${player.level} | 💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n\n`;

    if (devices && devices.length > 0) {
      msg += `🏭 *دستگاه‌ها:*\n`;
      devices.forEach(d => {
        msg += `⚡ ${d.item.name} (+${d.item.effect_value}/10دقیقه)\n`;
      });
    } else {
      msg += `🏭 دستگاهی نداری!`;
    }

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💰 جمع‌آوری', callback_data: cb('resources', uid) }],
          [{ text: '🛒 فروشگاه', callback_data: cb('shop', uid) }],
          [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]
        ]
      }
    });
  });

  bot.action(/resources:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await collectGold(ctx.from.id);
    const player = await getOrCreatePlayer(ctx.from);
    const uid = ctx.from.id;

    let msg = `💰 *منابع*\n\n`;
    if (result.totalGold > 0) {
      msg += `✅ +${formatGold(result.totalGold)} Gold جمع شد!`;
    } else {
      msg += `⏳ چیزی برای جمع‌آوری نیست.\nدستگاه‌ها هر ۱۰ دقیقه سکه میدن.`;
    }
    msg += `\n\n💰 موجودی: ${formatGold(player.gold)}`;

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏰 قلمرو', callback_data: cb('realm', uid) }],
          [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]
        ]
      }
    });
  });
};