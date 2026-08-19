const { Telegraf } = require('telegraf');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  botInstance.catch((err) => console.error('Bot error:', err));

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

  console.log('Bot initialized');
  return botInstance;
}

module.exports = { getBot };