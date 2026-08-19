const { getOrCreatePlayer } = require('../../game/player');
const { formatGold } = require('../../core/helpers');
const { mainMenu } = require('../keyboards');

module.exports = function registerProfile(bot) {
  bot.command('profile', async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      await ctx.reply(
        `👑 *پروفایل فرمانده*\n\n` +
        `🆔 ID: ${player.telegram_id}\n` +
        `👤 نام: ${player.commander_name}\n` +
        `🏰 قلمرو: ${player.realm_name}\n` +
        `⭐ سطح: ${player.level}\n` +
        `✨ تجربه: ${player.xp}\n\n` +
        `💰 Gold: ${formatGold(player.gold)}\n` +
        `💎 Gems: ${player.gems}\n` +
        `🍖 Food: ${formatGold(player.food)}\n` +
        `🪵 Wood: ${formatGold(player.wood)}\n` +
        `🪨 Stone: ${formatGold(player.stone)}\n` +
        `⚙️ Iron: ${formatGold(player.iron)}`,
        { parse_mode: 'Markdown', ...mainMenu }
      );
    } catch (e) {
      ctx.reply('⚠️ خطا: ' + e.message);
    }
  });
};