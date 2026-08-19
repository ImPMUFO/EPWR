const { getOrCreatePlayer } = require('../../game/player');
const { formatGold, cb } = require('../../core/helpers');

module.exports = function registerSettings(bot) {
  bot.action(/settings:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const uid = ctx.from.id;

    let msg = `⚙️ *تنظیمات*\n\n`;
    msg += `👤 ${ctx.from.first_name || 'Commander'}\n`;
    msg += `🆔 ${ctx.from.id}\n`;
    msg += `👑 ${player.commander_name}\n`;
    msg += `🏰 ${player.realm_name}\n`;
    msg += `⭐ Lv.${player.level}`;

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]] }
    });
  });

  bot.action(/profile:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    const uid = ctx.from.id;

    let msg = `👑 *پروفایل*\n\n`;
    msg += `🆔 ${player.telegram_id}\n`;
    msg += `👤 ${player.commander_name}\n`;
    msg += `🏰 ${player.realm_name}\n`;
    msg += `⭐ Lv.${player.level} | ✨ ${player.xp}\n\n`;
    msg += `💰 ${formatGold(player.gold)} | 💎 ${player.gems}`;

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]] }
    });
  });
};