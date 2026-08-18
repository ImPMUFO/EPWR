function registerHelp(bot) {
  bot.command('help', async (ctx) => {
    const helpMessage = `⚔️ **راهنمای EPWR**

/start - شروع بازی و منوی اصلی
/profile - نمایش پروفایل کامل
/help - نمایش این راهنما

بازی در حال توسعه است! 🚧`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  });
}

module.exports = { registerHelp };