const { getOrCreatePlayer } = require('../../game/player');
const { formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerSettings(bot) {
  bot.action(/^profile\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const xpToNext = player.xp_to_next || 100;
    const xpPercent = Math.floor(((player.xp || 0) / xpToNext) * 100);
    
    let msg = `👑 *پروفایل فرمانده*\n\n`;
    msg += `👤 نام: ${player.commander_name}\n`;
    msg += `🏰 قلمرو: ${player.realm_name}\n`;
    msg += `⭐ سطح: ${player.level}\n`;
    msg += `✨ XP: ${player.xp || 0}/${xpToNext} (${xpPercent}%)\n\n`;
    msg += `💰 Gold: ${formatGold(player.gold)}\n`;
    msg += `💎 Gems: ${player.gems}\n`;
    msg += `🍖 Food: ${formatGold(player.food || 0)}\n`;
    msg += `🪵 Wood: ${formatGold(player.wood || 0)}\n`;
    msg += `🪨 Stone: ${formatGold(player.stone || 0)}\n`;
    msg += `⚙️ Iron: ${formatGold(player.iron || 0)}`;
    
    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: cb('mainmenu', ctx.from.id) }]]
      }
    });
  });
};