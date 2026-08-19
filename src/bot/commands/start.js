const { getOrCreatePlayer } = require('../../game/player');
const { formatGold } = require('../../core/helpers');
const { mainMenu } = require('../keyboards');

module.exports = function registerStart(bot) {
  bot.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);

      let msg = `⚔️ *به EPWR خوش آمدی!*\n\n`;
      msg += `━━━━━━━━━━━━━━━━\n`;
      msg += `👑 فرمانده: *${player.commander_name}*\n`;
      msg += `🏰 قلمرو: ${player.realm_name}\n`;
      msg += `⭐ سطح: ${player.level}\n`;
      msg += `━━━━━━━━━━━━━━━━\n`;
      msg += `💰 ${formatGold(player.gold)} Gold\n`;
      msg += `💎 ${player.gems} Gems\n`;
      msg += `━━━━━━━━━━━━━━━━\n\n`;
      msg += `🎯 آماده‌ای برای نبرد حماسی؟\n`;
      msg += `⚔️ قهرمان بخر، ارتش بساز، دشمنان رو شکست بده!`;

      await ctx.reply(msg, { parse_mode: 'Markdown', ...mainMenu });
    } catch (e) {
      console.error('Start error:', e);
      ctx.reply('⚠️ خطا: ' + e.message);
    }
  });

  bot.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);

    let msg = `⚔️ *منوی اصلی*\n\n`;
    msg += `👑 ${player.commander_name}\n`;
    msg += `💰 ${formatGold(player.gold)} | 💎 ${player.gems}\n`;
    msg += `⭐ Lv.${player.level}`;

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...mainMenu });
  });
};