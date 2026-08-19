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

  // همه دستورات
  const commands = [
    'start', 'shop', 'battle', 'realm', 'world', 'ranking',
    'settings', 'gift', 'admin', 'pvp', 'alliance', 'quest', 'profile'
  ];

  commands.forEach(cmd => {
    try {
      require(`./commands/${cmd}`)(botInstance);
      console.log(`✅ ${cmd} loaded`);
    } catch(e) {
      console.error(`❌ ${cmd} error:`, e.message);
    }
  });

  console.log('✅ Bot initialized');
  return botInstance;
}

module.exports = { getBot };