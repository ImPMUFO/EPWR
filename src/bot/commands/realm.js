const { getOrCreatePlayer } = require('../../game/player');
const { collectGold } = require('../../game/realm');
const { getSupabase } = require('../../core/supabase');
const { formatGold, smartReply, cb } = require('../../core/helpers');

async function getRealmBg() {
  const db = getSupabase();
  const { data } = await db.from('bot_assets').select('file_id').eq('key', 'realm_bg').maybeSingle();
  return data?.file_id || null;
}

module.exports = function registerRealm(bot) {
  bot.action(/^realm\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const db = getSupabase();
    const uid = ctx.from.id;
    const { data: devices } = await db.from('player_items').select('id, item:shop_items (name, effect_value)').eq('telegram_id', ctx.from.id).eq('is_active', true);
    let msg = `🏰 *${player.realm_name}*\n\n⭐ Lv.${player.level} | 💰 ${formatGold(player.gold)}\n🍖 ${player.food || 0}/${player.food_capacity || 1000} | 🥚 ${player.eggs || 0}\n\n`;
    if (devices && devices.length > 0) {
      msg += '🏭 *دستگاه‌ها:*\n';
      devices.forEach(d => msg += `⚡ ${d.item.name} (+${d.item.effect_value}/10دقیقه)\n`);
    } else msg += '🏭 دستگاهی نداری!';

    const markup = {
      inline_keyboard: [
        [{ text: '💰 جمع‌آوری', callback_data: cb('resources', uid) }, { text: '🏗️ ساختمان‌ها', callback_data: cb('buildings', uid) }],
        [{ text: '🔙', callback_data: cb('mainmenu', uid) }]
      ]
    };

    const bg = await getRealmBg();
    if (bg) {
      try {
        await ctx.telegram.sendPhoto(ctx.chat.id, bg, { caption: msg, parse_mode: 'Markdown', reply_markup: markup });
        return;
      } catch(e) {}
    }
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: markup });
  });

  bot.action(/^resources\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await collectGold(ctx.from.id);
    const player = await getOrCreatePlayer(ctx.from);
    const uid = ctx.from.id;
    let msg = result.totalGold > 0 ? `💰 *+${formatGold(result.totalGold)} جمع شد!*\n\n💰 موجودی: ${formatGold(player.gold)}` : `⏳ چیزی نیست!\nدستگاه‌ها هر ۱۰ دقیقه سکه میدن.\n\n💰 موجودی: ${formatGold(player.gold)}`;
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🏰 قلمرو', callback_data: cb('realm', uid) }], [{ text: '🔙', callback_data: cb('mainmenu', uid) }]] } });
  });
};