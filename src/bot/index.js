const { Telegraf } = require('telegraf');
const { getSession } = require('../game/battle');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  botInstance.catch((err) => console.error('Bot error:', err));

  // Middleware: چک مالک منو در گروه
  botInstance.use(async (ctx, next) => {
    if (ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      const stateActions = [
        'battle_npc', 'toggle_hero', 'confirm_attack',
        'pvp_target', 'toggle_hero_pvp', 'pvp_confirm',
        'alliance_join', 'claim_quest', 'use_potion',
        'admin_toggle', 'admin_delete'
      ];
      const isStateAction = stateActions.some(a => data.startsWith(a));
      
      if (isStateAction) {
        const session = getSession(ctx.from.id);
        const needsTarget = ['toggle_hero', 'confirm_attack', 'toggle_hero_pvp', 'pvp_confirm'].includes(data.split(':')[0]);
        
        if (needsTarget && (!session.target || session.selectedHeroes === undefined)) {
          return ctx.answerCbQuery('⚠️ این منو برای شما نیست!\nلطفاً /start بزنید و منوی خودتان را بسازید.', { show_alert: true });
        }
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