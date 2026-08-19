const { getOrCreatePlayer } = require('../../game/player');
const { formatGold } = require('../../core/helpers');
const { mainMenu } = require('../keyboards');

module.exports = function registerSettings(bot) {

  bot.action('settings', async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);

    let msg = `⚙️ *تنظیمات*\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n`;
    msg += `👤 نام: ${ctx.from.first_name || 'Commander'}\n`;
    msg += `🆔 آیدی: ${ctx.from.id}\n`;
    msg += `📱 یوزرنیم: @${ctx.from.username || '---'}\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;
    msg += `👑 فرمانده: ${player.commander_name}\n`;
    msg += `🏰 قلمرو: ${player.realm_name}\n`;
    msg += `⭐ سطح: ${player.level}\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;
    msg += `🎮 *EPWR | نبرد حماسی*\n`;
    msg += `⚔️ نسخه 1.0\n`;
    msg += `📅 ساخته شده با ❤️`;

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 پروفایل کامل', callback_data: 'profile' }],
          [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
        ]
      }
    });
  });

  bot.action('profile', async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);

    let msg = `👑 *پروفایل کامل*\n\n`;
    msg += `🆔 آیدی: ${player.telegram_id}\n`;
    msg += `👤 نام: ${player.commander_name}\n`;
    msg += `🏰 قلمرو: ${player.realm_name}\n`;
    msg += `⭐ سطح: ${player.level}\n`;
    msg += `✨ تجربه: ${player.xp}\n\n`;
    msg += `💰 Gold: ${formatGold(player.gold)}\n`;
    msg += `💎 Gems: ${player.gems}\n`;
    msg += `🍖 Food: ${formatGold(player.food)}\n`;
    msg += `🪵 Wood: ${formatGold(player.wood)}\n`;
    msg += `🪨 Stone: ${formatGold(player.stone)}\n`;
    msg += `⚙️ Iron: ${formatGold(player.iron)}`;

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚙️ تنظیمات', callback_data: 'settings' }],
          [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
        ]
      }
    });
  });
};