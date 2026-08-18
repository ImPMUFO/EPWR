const { Telegraf } = require('telegraf');
const { validateEnv } = require('../core/env');
const logger = require('../core/logger');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;

  validateEnv();
  
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  
  // Error handler
  botInstance.catch((err, ctx) => {
    logger.error(`خطا در ${ctx.updateType}`, err);
    ctx.reply('⚠️ خطایی رخ داد. لطفاً بعداً تلاش کنید.');
  });

  // ثبت دستورات
  const { registerStart } = require('./commands/start');
  const { registerProfile } = require('./commands/profile');
  const { registerHelp } = require('./commands/help');

  registerStart(botInstance);
  registerProfile(botInstance);
  registerHelp(botInstance);

  logger.info('✅ Bot initialized');
  return botInstance;
}

module.exports = { getBot };