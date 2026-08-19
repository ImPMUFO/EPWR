const { getOrCreatePlayer } = require('../../game/player');
const { formatGold, reply } = require('../../core/helpers');
const { mainMenu } = require('../keyboards');

module.exports = function registerStart(bot) {
  bot.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      let msg = `⚔️ *EPWR*\n\n`;
      msg += `👑 ${player.commander_name} | ⭐ Lv.${player.level}\n`;
      msg += `💰 ${formatGold(player.gold)} | 💎 ${player.gems}`;
      await reply(ctx, msg, { parse_mode: 'Markdown', ...mainMenu });
    } catch (e) {
      await reply(ctx, '⚠️ خطا: ' + e.message);
    }
  });

  bot.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    let msg = `⚔️ *EPWR*\n\n`;
    msg += `👑 ${player.commander_name} | ⭐ Lv.${player.level}\n`;
    msg += `💰 ${formatGold(player.gold)} | 💎 ${player.gems}`;
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...mainMenu });
  });
};