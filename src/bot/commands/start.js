const { getOrCreatePlayer } = require('../../game/player');
const { formatGold, reply, cb } = require('../../core/helpers');
const { buildMainMenu } = require('../keyboards');

module.exports = function registerStart(bot) {
  bot.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      const msg = `⚔️ *EPWR*\n\n👑 ${player.commander_name} | ⭐ Lv.${player.level}\n💰 ${formatGold(player.gold)} | 💎 ${player.gems}`;
      await reply(ctx, msg, { parse_mode: 'Markdown', ...buildMainMenu(ctx.from.id) });
    } catch (e) {
      await reply(ctx, '⚠️ خطا: ' + e.message);
    }
  });

  bot.action(/^mainmenu\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const msg = `⚔️ *EPWR*\n\n👑 ${player.commander_name} | ⭐ Lv.${player.level}\n💰 ${formatGold(player.gold)} | 💎 ${player.gems}`;
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...buildMainMenu(ctx.from.id) });
  });
};