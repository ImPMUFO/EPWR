module.exports = function registerAlliance(bot) {

  bot.action('alliance', async (ctx) => {
    await ctx.answerCbQuery();

    let msg = `🤝 *اتحادها*\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n`;
    msg += `⚔️ با دوستانت متحد شو!\n`;
    msg += `🏰 با هم قلمرو بسازید!\n`;
    msg += `💪 با هم بجنگید!\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;
    msg += `🚧 *سیستم اتحاد در حال توسعه است...*\n\n`;
    msg += `📅 به زودی:\n`;
    msg += `   • ساخت اتحاد\n`;
    msg += `   • دعوت دوستان\n`;
    msg += `   • جنگ اتحادها\n`;
    msg += `   • خزانه مشترک\n`;

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
        ]
      }
    });
  });
};