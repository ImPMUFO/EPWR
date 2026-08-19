const { Telegraf } = require('telegraf');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  botInstance.catch((err) => console.error('Bot error:', err));

  const registerStart = require('./commands/start');
  const registerProfile = require('./commands/profile');
  const registerShop = require('./commands/shop');

  registerStart(botInstance);
  registerProfile(botInstance);
  registerShop(botInstance);

  console.log('Bot initialized');
  return botInstance;
}

module.exports = { getBot };