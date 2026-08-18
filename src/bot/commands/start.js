const { PlayerService } = require('../../game/player/PlayerService');
const { getMainMenuKeyboard } = require('../keyboards/mainMenu');
const logger = require('../../core/logger');

function registerStart(bot) {
  bot.start(async (ctx) => {
    try {
      const playerService = new PlayerService();
      const player = await playerService.getOrCreate(ctx.from);

      const welcomeMessage = `⚔️ **به EPWR خوش آمدی!**

👑 فرمانده: ${player.commander_name}
🏰 قلمرو: ${player.realm_name}
⭐ سطح: ${player.level}

💰 ${player.gold.toLocaleString()} Gold
💎 ${player.gems} Gems

آماده‌ای برای نبرد حماسی؟`;

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      });

      logger.info(`بازیکن شروع کرد: ${ctx.from.id}`);
    } catch (error) {
      logger.error('خطا در /start', error);
      await ctx.reply('⚠️ خطایی رخ داد. لطفاً دوباره تلاش کن.');
    }
  });
}

module.exports = { registerStart };