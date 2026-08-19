const { Telegraf } = require('telegraf');
const registerStart = require('./commands/start');
const registerProfile = require('./commands/profile');
const registerShop = require('./commands/shop');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;

  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  botInstance.catch((err, ctx) => {
    console.error(`Error in ${ctx.updateType}:`, err);
    ctx.reply('⚠️ خطایی رخ داد.');
  });

  // ثبت همه دستورات
  registerStart(botInstance);
  registerProfile(botInstance);
  registerShop(botInstance);

  console.log('✅ Bot initialized');
  return botInstance;
}

module.exports = { getBot };