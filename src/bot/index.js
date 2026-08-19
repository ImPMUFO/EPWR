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

  // فقط دستورات اصلی
  try { require('./commands/start')(botInstance); } catch(e) { console.error('start.js error:', e.message); }
  try { require('./commands/shop')(botInstance); } catch(e) { console.error('shop.js error:', e.message); }
  try { require('./commands/battle')(botInstance); } catch(e) { console.error('battle.js error:', e.message); }
  try { require('./commands/realm')(botInstance); } catch(e) { console.error('realm.js error:', e.message); }
  try { require('./commands/world')(botInstance); } catch(e) { console.error('world.js error:', e.message); }
  try { require('./commands/ranking')(botInstance); } catch(e) { console.error('ranking.js error:', e.message); }
  try { require('./commands/settings')(botInstance); } catch(e) { console.error('settings.js error:', e.message); }
  try { require('./commands/gift')(botInstance); } catch(e) { console.error('gift.js error:', e.message); }
  try { require('./commands/admin')(botInstance); } catch(e) { console.error('admin.js error:', e.message); }

  console.log('✅ Bot initialized');
  return botInstance;
}

module.exports = { getBot };