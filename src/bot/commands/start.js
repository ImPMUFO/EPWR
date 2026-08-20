const { getOrCreatePlayer } = require('../../game/player');
const { processFoodConsumption } = require('../../game/food');
const { formatGold, reply, cb } = require('../../core/helpers');
const { buildMainMenu } = require('../keyboards');

module.exports = function registerStart(bot) {
  bot.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      await processFoodConsumption(ctx.from.id);

      const xpToNext = player.xp_to_next || 100;
      const xpPercent = Math.floor(((player.xp || 0) / xpToNext) * 100);
      const msg = `⚔️ *EPWR*\n\n` +
        `👑 ${player.commander_name} | ⭐ Lv.${player.level}\n` +
        `✨ XP: ${player.xp || 0}/${xpToNext} (${xpPercent}%)\n` +
        `💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n` +
        `🍖 ${player.food || 0}/${player.food_capacity || 1000}`;
      await reply(ctx, msg, { parse_mode: 'Markdown', ...buildMainMenu(ctx.from.id) });
    } catch (e) {
      await reply(ctx, '⚠️ خطا: ' + e.message);
    }
  });

  bot.action(/^mainmenu\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const xpToNext = player.xp_to_next || 100;
    const xpPercent = Math.floor(((player.xp || 0) / xpToNext) * 100);
    const msg = `⚔️ *EPWR*\n\n` +
      `👑 ${player.commander_name} | ⭐ Lv.${player.level}\n` +
      `✨ XP: ${player.xp || 0}/${xpToNext} (${xpPercent}%)\n` +
      `💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n` +
      `🍖 ${player.food || 0}/${player.food_capacity || 1000}`;
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...buildMainMenu(ctx.from.id) });
  });
};