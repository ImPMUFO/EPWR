const { Telegraf } = require('telegraf');
const { hasActiveSession } = require('../game/battle');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  botInstance.catch((err) => console.error('Bot error:', err));

  // ═══ Middleware: محافظت از منو در گروه ═══
  botInstance.use(async (ctx, next) => {
    if (!ctx.callbackQuery) return next();

    const data = ctx.callbackQuery.data;
    
    // اکشن‌هایی که حتماً نیاز به session فعال دارن
    const sessionRequiredActions = [
      'battle_npc:', 'toggle_hero:', 'confirm_attack',
      'pvp_target:', 'toggle_hero_pvp:', 'pvp_confirm'
    ];

    const needsSession = sessionRequiredActions.some(action => data.startsWith(action));

    if (needsSession) {
      if (!hasActiveSession(ctx.from.id)) {
        return ctx.answerCbQuery(
          '⚠️ این منو برای شما نیست!\n\nلطفاً /start بزنید و منوی خودتان را بسازید.',
          { show_alert: true }
        );
      }
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

  console.log('Bot initialized');
  return botInstance;
}

module.exports = { getBot };