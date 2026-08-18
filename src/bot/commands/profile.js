const { PlayerService } = require('../../game/player/PlayerService');
const { getMainMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../../core/logger');

function registerProfile(bot) {
  bot.command('profile', async (ctx) => {
    try {
      const playerService = new PlayerService();
      const player = await playerService.getOrCreate(ctx.from);

      const profileMessage = `👑 **پروفایل فرمانده**

🆔 ID: ${player.telegram_id}
👤 نام: ${player.commander_name}
🏰 قلمرو: ${player.realm_name}
⭐ سطح: ${player.level}
✨ تجربه: ${player.xp}

💰 Gold: ${player.gold.toLocaleString()}
💎 Gems: ${player.gems}
🍖 Food: ${player.food.toLocaleString()}
🪵 Wood: ${player.wood.toLocaleString()}
🪨 Stone: ${player.stone.toLocaleString()}
⚙️ Iron: ${player.iron.toLocaleString()}`;

      await ctx.reply(profileMessage, {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      });
    } catch (error) {
      logger.error('خطا در /profile', error);
      await ctx.reply('⚠️ خطایی رخ داد.');
    }
  });
}

module.exports = { registerProfile };