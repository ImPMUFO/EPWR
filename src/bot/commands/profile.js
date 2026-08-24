const { showRealm } = require('./realm');

module.exports = function registerProfile(bot) {
  bot.command('profile', async (ctx) => { await showRealm(ctx); });
  bot.action(/^profile\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showRealm(ctx); });
};