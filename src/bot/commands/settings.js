const { getOrCreatePlayer } = require('../../game/player');
const { formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerSettings(bot) {
  bot.action(/^settings\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    let msg = `⚙️ *تنظیمات*\n\n👤 ${ctx.from.first_name}\n🆔 ${ctx.from.id}\n👑 ${player.commander_name}\n🏰 ${player.realm_name}\n⭐ Lv.${player.level}`;
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]] } });
  });

  bot.action(/^profile\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    let msg = `👑 *پروفایل*\n\n🆔 ${player.telegram_id}\n👤 ${player.commander_name}\n🏰 ${player.realm_name}\n⭐ Lv.${player.level} | ✨ ${player.xp || 0}\n\n💰 ${formatGold(player.gold)} | 💎 ${player.gems}`;
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]] } });
  });
};