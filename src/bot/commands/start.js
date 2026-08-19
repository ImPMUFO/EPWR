const { getOrCreatePlayer } = require('../../game/player');
const { formatGold } = require('../../core/helpers');
const { mainMenu } = require('../keyboards');

module.exports = function registerStart(bot) {
  bot.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      await ctx.reply(
        `⚔️ *به EPWR خوش آمدی!*\n\n` +
        `👑 فرمانده: ${player.commander_name}\n` +
        `🏰 قلمرو: ${player.realm_name}\n` +
        `⭐ سطح: ${player.level}\n\n` +
        `💰 ${formatGold(player.gold)} Gold\n` +
        `💎 ${player.gems} Gems\n\n` +
        `آماده‌ای برای نبرد حماسی؟`,
        { parse_mode: 'Markdown', ...mainMenu }
      );
    } catch (e) {
      console.error('Start error:', e);
      ctx.reply('⚠️ خطا: ' + e.message);
    }
  });

  bot.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    await ctx.editMessageText(
      `⚔️ *منوی اصلی*\n\n👑 ${player.commander_name}\n💰 ${formatGold(player.gold)} | 💎 ${player.gems}`,
      { parse_mode: 'Markdown', ...mainMenu }
    );
  });

  const placeholders = ['realm', 'army', 'world', 'resources', 'ranking', 'alliance', 'settings'];
  placeholders.forEach(key => {
    bot.action(key, async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(`🚧 این بخش به زودی اضافه می‌شود!`);
    });
  });
};