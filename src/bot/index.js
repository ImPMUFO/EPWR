const { Telegraf } = require('telegraf');
const { isOwner } = require('../core/helpers');
const { getSupabase } = require('../core/supabase');
const { processKitchenProduction } = require('../game/buildings');

let botInstance = null;

async function getBot() {
  if (botInstance) return botInstance;
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  botInstance.catch((err) => console.error('Bot error:', err));

  // ═══ محافظ: فقط اولین answerCbQuery اثر کنه ═══
  botInstance.use(async (ctx, next) => {
    if (ctx.callbackQuery) {
      const orig = ctx.answerCbQuery.bind(ctx);
      let answered = false;
      ctx.answerCbQuery = async (...args) => {
        if (answered) return;
        answered = true;
        try { return await orig(...args); } catch(e) { console.error('answerCbQuery error:', e.message); }
      };
    }
    return next();
  });

  // ═══ تولید خودکار: روی هر تعامل کاربر، سکه‌ها تا لحظه آخر آپدیت میشن ═══
  botInstance.use(async (ctx, next) => {
    const uid = ctx.from && ctx.from.id;
    if (uid) {
      try { await processKitchenProduction(uid); } catch(e) {}
    }
    return next();
  });

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

  // ═══ ذخیره گروه و تبدیل خودکار به اتحاد ═══
  botInstance.on('new_chat_members', async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const isBotAdded = newMembers.some(m => m.is_bot);
    if (isBotAdded) {
      try {
        const db = getSupabase();
        await db.from('bot_groups').upsert({ group_id: ctx.chat.id, group_name: ctx.chat.title });
        const { data: existingAlliance } = await db.from('alliances').select('id').eq('linked_group_id', ctx.chat.id).maybeSingle();
        if (!existingAlliance) {
          const ownerId = ctx.chat.owner_id || ctx.from.id;
          const allianceName = ctx.chat.title || 'اتحاد گروه';
          const allianceTag = (ctx.chat.title || 'GRP').replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'GRP';
          await db.from('alliances').insert({ name: allianceName, tag: allianceTag, description: 'اتحاد ساخته شده از گروه تلگرام', leader_id: ownerId, linked_group_id: ctx.chat.id, linked_group_name: ctx.chat.title });
          const { data: alliance } = await db.from('alliances').select('*').eq('linked_group_id', ctx.chat.id).single();
          if (alliance) {
            await db.from('alliance_members').insert({ alliance_id: alliance.id, telegram_id: ownerId, role: 'leader' });
            await ctx.reply(`🎏 *اتحاد "${alliance.name}" ساخته شد!*\n\n👑 رهبر: مالک گروه`, { parse_mode: 'Markdown' });
          }
        }
      } catch(e) { console.error('Group to alliance error:', e.message); }
    }
  });

  // ═══ ذخیره گروه‌های فعلی ═══
  botInstance.use(async (ctx, next) => {
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      try {
        const db = getSupabase();
        await db.from('bot_groups').upsert({ group_id: ctx.chat.id, group_name: ctx.chat.title });
      } catch(e) {}
    }
    return next();
  });

  const commands = [
    'start', 'shop', 'battle', 'realm', 'ranking', 'market',
    'settings', 'gift', 'admin', 'pvp', 'alliance', 'quest',
    'profile', 'notifications', 'buildings', 'guide', 'cosmetics'
  ];

  commands.forEach(cmd => {
    try { require(`./commands/${cmd}`)(botInstance); }
    catch(e) { console.error(`❌ ${cmd} error:`, e.message); }
  });

  // ═══ catch-all: دکمه‌های مرده بی‌جواب نمونن ═══
  botInstance.action(/^[\s\S]+$/, async (ctx) => {
    await ctx.answerCbQuery('⚠️ این دکمه فعلاً کار نمی‌کنه!\nلطفاً /start بزنید.', { show_alert: true });
  });

  // ═══ تنظیم دستورات ═══
  botInstance.telegram.setMyCommands([
    { command: 'start', description: 'شروع بازی و منوی اصلی' },
    { command: 'battle', description: 'جنگ با سرزمین‌ها' },
    { command: 'shop', description: 'فروشگاه' },
    { command: 'alliance', description: 'اتحاد' },
    { command: 'ranking', description: 'رتبه‌بندی' },
    { command: 'guide', description: 'راهنمای بازی' },
    { command: 'gift', description: 'کد هدیه' },
    { command: 'notifications', description: 'اعلان‌ها' }
  ]).catch(e => console.error('setMyCommands error:', e.message));

  console.log('✅ Bot initialized');
  return botInstance;
}

module.exports = { getBot };