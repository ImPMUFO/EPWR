const { getOrCreatePlayer } = require('../../game/player');
const { collectGold } = require('../../game/realm');
const { formatGold } = require('../../core/helpers');
const { mainMenu } = require('../keyboards');

module.exports = function registerRealm(bot) {

  bot.action('realm', async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    await ctx.editMessageText(
      `🏰 *قلمرو: ${player.realm_name}*\n\n⭐ سطح: ${player.level}\n💰 Gold: ${formatGold(player.gold)}\n💎 Gems: ${player.gems}\n🍖 Food: ${formatGold(player.food)}\n🪵 Wood: ${formatGold(player.wood)}\n🪨 Stone: ${formatGold(player.stone)}\n⚙️ Iron: ${formatGold(player.iron)}`,
      { parse_mode: 'Markdown', ...mainMenu }
    );
  });

  bot.action('resources', async (ctx) => {
    await ctx.answerCbQuery();
    const result = await collectGold(ctx.from.id);
    const player = await getOrCreatePlayer(ctx.from);

    let msg = `💰 *منابع قلمرو*\n\n`;
    if (result.totalGold > 0) {
      msg += `✅ *جمع‌آوری شد: ${formatGold(result.totalGold)} Gold!*\n\n`;
      result.details.forEach(d => { msg += `   ${d}\n`; });
      msg += `\n`;
    } else {
      msg += `⏳ هنوز منابعی جمع نشده.\nهر ساعت دستگاه‌ها سکه تولید می‌کنند!\n\n`;
    }
    msg += `💰 موجودی فعلی: ${formatGold(player.gold)} Gold`;

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', ...mainMenu });
  });

  bot.action('settings', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `⚙️ *تنظیمات*\n\n🆔 ID: ${ctx.from.id}\n👤 نام: ${ctx.from.first_name}\n\n🚧 بخش‌های بیشتر به زودی!`,
      { parse_mode: 'Markdown', ...mainMenu }
    );
  });

  bot.action('alliance', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`🤝 *اتحادها*\n\nسیستم اتحاد به زودی فعال می‌شود!\nبا دوستانت متحد شو و با هم بجنگید! ⚔️`, { parse_mode: 'Markdown' });
  });
};