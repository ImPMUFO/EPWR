const { Telegraf } = require('telegraf');
const { isOwner } = require('../core/helpers');
const { getSupabase } = require('../core/supabase');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  botInstance.catch((err) => console.error('Bot error:', err));

  // ═══ Middleware: محافظت از منو ═══
  botInstance.use(async (ctx, next) => {
    if (ctx.callbackQuery) {
      if (!isOwner(ctx)) {
        return ctx.answerCbQuery(
          '⚠️ این منو برای شما نیست!\nلطفاً /start بزنید و منوی خودتان را بسازید.',
          { show_alert: true }
        );
      }
    }
    return next();
  });

  // ═══ ذخیره گروه وقتی ربات اضافه میشه ═══
  botInstance.on('new_chat_members', async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const isBotAdded = newMembers.some(m => m.is_bot);
    if (isBotAdded) {
      try {
        const db = getSupabase();
        await db.from('bot_groups').upsert({
          group_id: ctx.chat.id,
          group_name: ctx.chat.title
        });
        console.log(`✅ گروه ذخیره شد: ${ctx.chat.title}`);
      } catch(e) {
        console.error('Group save error:', e.message);
      }
    }
  });

  const commands = [
    'start', 'shop', 'battle', 'realm', 'world', 'ranking',
    'settings', 'gift', 'admin', 'pvp', 'alliance', 'quest',
    'profile', 'notifications', 'buildings', 'guide'
  ];

  commands.forEach(cmd => {
    try {
      require(`./commands/${cmd}`)(botInstance);
    } catch(e) {
      console.error(`❌ ${cmd} error:`, e.message);
    }
  });

  console.log('✅ Bot initialized');
  return botInstance;
}

module.exports = { getBot };