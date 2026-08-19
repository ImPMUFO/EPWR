const { Telegraf } = require('telegraf');
const { isOwner } = require('../core/helpers');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  botInstance.catch((err) => console.error('Bot error:', err));

  botInstance.use(async (ctx, next) => {
    if (ctx.callbackQuery && !isOwner(ctx)) {
      return ctx.answerCbQuery('⚠️ این منو برای شما نیست! /start بزنید.', { show_alert: true });
    }
    return next();
  });

  require('./commands/start')(botInstance);
  require('./commands/profile')(botInstance);
  require('./commands/shop')(botInstance);
  require('./commands/battle')(botInstance);
  require('./commands/world')(botInstance);
  require('./commands/realm')(botInstance);
  require('./commands/ranking')(botInstance);
  require('./commands/gift')(botInstance);
  require('./commands/admin')(botInstance);
  require('./commands/settings')(botInstance);
  require('./commands/alliance')(botInstance);
  require('./commands/quest')(botInstance);
  require('./commands/pvp')(botInstance);

  return botInstance;
}

module.exports = { getBot };