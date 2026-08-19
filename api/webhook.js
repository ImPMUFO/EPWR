const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return supabase;
}

let botInstance = null;
async function getBot() {
  if (botInstance) return botInstance;
  
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  
  botInstance.catch((err, ctx) => {
    console.error(`Error in ${ctx.updateType}:`, err);
    ctx.reply('⚠️ خطایی رخ داد.');
  });

  // /start
  botInstance.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      await ctx.reply(
        `⚔️ *به EPWR خوش آمدی!*\n\n👑 فرمانده: ${player.commander_name}\n🏰 قلمرو: ${player.realm_name}\n⭐ سطح: ${player.level}\n\n💰 ${player.gold.toLocaleString()} Gold\n💎 ${player.gems} Gems\n\nآماده‌ای برای نبرد حماسی؟`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏰 قلمرو', callback_data: 'realm' }, { text: '⚔️ ارتش', callback_data: 'army' }],
              [{ text: '🗺️ جهان', callback_data: 'world' }, { text: '💰 منابع', callback_data: 'resources' }],
              [{ text: '🏆 رتبه‌بندی', callback_data: 'ranking' }, { text: '🤝 اتحاد', callback_data: 'alliance' }],
              [{ text: '⚙️ تنظیمات', callback_data: 'settings' }]
            ]
          }
        }
      );
    } catch (e) {
      console.error('Start error:', e);
      ctx.reply('⚠️ خطا: ' + e.message);
    }
  });

  // /profile
  botInstance.command('profile', async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      await ctx.reply(
        `👑 *پروفایل فرمانده*\n\n🆔 ${player.telegram_id}\n👤 ${player.commander_name}\n🏰 ${player.realm_name}\n⭐ Level ${player.level}\n✨ XP: ${player.xp}\n\n💰 ${player.gold.toLocaleString()}\n💎 ${player.gems}\n🍖 ${player.food.toLocaleString()}\n🪵 ${player.wood.toLocaleString()}\n🪨 ${player.stone.toLocaleString()}\n⚙️ ${player.iron.toLocaleString()}`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Profile error:', e);
      ctx.reply('⚠️ خطا: ' + e.message);
    }
  });

  // /help
  botInstance.command('help', async (ctx) => {
    await ctx.reply(
      `⚔️ *راهنمای EPWR*\n\n/start - شروع بازی\n/profile - پروفایل\n/help - راهنما\n\nبازی در حال توسعه است! 🚧`,
      { parse_mode: 'Markdown' }
    );
  });

  botInstance.action('realm', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🏰 سیستم قلمرو به زودی اضافه میشه!');
  });

  botInstance.action('army', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('⚔️ سیستم ارتش به زودی اضافه میشه!');
  });

  botInstance.action('world', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🗺️ نقشه جهان به زودی اضافه میشه!');
  });

  botInstance.action('resources', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('💰 سیستم منابع به زودی اضافه میشه!');
  });

  botInstance.action('ranking', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🏆 رتبه‌بندی به زودی اضافه میشه!');
  });

  botInstance.action('alliance', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🤝 سیستم اتحاد به زودی اضافه میشه!');
  });

  botInstance.action('settings', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('⚙️ تنظیمات به زودی اضافه میشه!');
  });

  return botInstance;
}

async function getOrCreatePlayer(telegramUser) {
  const db = getSupabase();
  const telegramId = telegramUser.id;
  const username = telegramUser.username || null;
  const firstName = telegramUser.first_name || 'Commander';

  const { data: existing, error: fetchErr } = await db
    .from('players')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    await db.from('players').update({
      telegram_username: username,
      first_name: firstName,
      last_active_at: new Date().toISOString()
    }).eq('telegram_id', telegramId);
    return existing;
  }

  // بازیکن جدید
  const { data: newPlayer, error: createErr } = await db
    .from('players')
    .insert({
      telegram_id: telegramId,
      telegram_username: username,
      first_name: firstName,
      commander_name: firstName,
      realm_name: firstName + "'s Realm"
    })
    .select()
    .single();

  if (createErr) throw createErr;

  // ساخت قلمرو
  const position = await findFreePosition(db);
  await db.from('realms').insert({
    owner_telegram_id: telegramId,
    name: newPlayer.realm_name,
    map_x: position.x,
    map_y: position.y,
    territory_level: 1,
    wall_level: 0,
    population: 100
  });

  return newPlayer;
}

async function findFreePosition(db) {
  for (let radius = 0; radius < 100; radius++) {
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        if (Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
        const { data } = await db.from('realms')
          .select('id')
          .eq('map_x', x)
          .eq('map_y', y)
          .maybeSingle();
        if (!data) return { x, y };
      }
    }
  }
  throw new Error('No free position');
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const bot = await getBot();
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } else {
      res.status(200).json({
        ok: true,
        service: 'EPWR Telegram Bot',
        message: 'EPWR is alive ⚔️'
      });
    }
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error: ' + err.message);
  }
};