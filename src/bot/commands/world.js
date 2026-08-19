const { getBotRealms } = require('../../game/battle');

module.exports = function registerWorld(bot) {
  bot.command('world', async (ctx) => { await showWorld(ctx); });
  bot.action('world', async (ctx) => { await ctx.answerCbQuery(); await showWorld(ctx); });

  async function showWorld(ctx) {
    const bots = await getBotRealms();
    let msg = `🗺️ *نقشه جهان EPWR*\n\nسرزمین‌های قابل فتح:\n\n`;
    const buttons = [];

    bots.forEach(b => {
      const stars = '⭐'.repeat(b.difficulty);
      msg += `${b.emoji} *${b.name}* ${stars}\n   📖 ${b.description}\n\n`;
      buttons.push([{ text: `${b.emoji} ${b.name}`, callback_data: `battle_npc:${b.id}` }]);
    });

    buttons.push([{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]);

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }
};