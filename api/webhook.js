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

// ═══════════════════════════════════════
// توابع کمکی
// ═══════════════════════════════════════

function rarityEmoji(rarity) {
  return { common: '⚪', rare: '🔵', epic: '🟣', legendary: '🟡' }[rarity] || '⚪';
}

function rarityName(rarity) {
  return { common: 'معمولی', rare: 'کمیاب', epic: 'حماسی', legendary: 'افسانه‌ای' }[rarity] || 'معمولی';
}

// ═══════════════════════════════════════
// سیستم بازیکن
// ═══════════════════════════════════════

async function getOrCreatePlayer(telegramUser) {
  const db = getSupabase();
  const telegramId = telegramUser.id;
  const username = telegramUser.username || null;
  const firstName = telegramUser.first_name || 'Commander';

  const { data: existing, error: fetchErr } = await db
    .from('players').select('*').eq('telegram_id', telegramId).maybeSingle();

  if (fetchErr) throw fetchErr;

  if (existing) {
    await db.from('players').update({
      telegram_username: username,
      first_name: firstName,
      last_active_at: new Date().toISOString()
    }).eq('telegram_id', telegramId);
    return existing;
  }

  const { data: newPlayer, error: createErr } = await db
    .from('players').insert({
      telegram_id: telegramId,
      telegram_username: username,
      first_name: firstName,
      commander_name: firstName,
      realm_name: firstName + "'s Realm"
    }).select().single();

  if (createErr) throw createErr;

  // ساخت قلمرو
  const position = await findFreePosition(db);
  await db.from('realms').insert({
    owner_telegram_id: telegramId,
    name: newPlayer.realm_name,
    map_x: position.x, map_y: position.y,
    territory_level: 1, wall_level: 0, population: 100
  });

  return newPlayer;
}

async function findFreePosition(db) {
  for (let radius = 0; radius < 100; radius++) {
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        if (Math.abs(x) !== radius && Math.abs(y) !== radius) continue;
        const { data } = await db.from('realms')
          .select('id').eq('map_x', x).eq('map_y', y).maybeSingle();
        if (!data) return { x, y };
      }
    }
  }
  throw new Error('No free position');
}

// ═══════════════════════════════════════
// فروشگاه شخصیت‌ها
// ═══════════════════════════════════════

async function showShop(ctx) {
  const db = getSupabase();
  const { data: characters, error } = await db
    .from('character_templates')
    .select('*')
    .order('price_gold', { ascending: true });

  if (error || !characters || characters.length === 0) {
    return ctx.reply('⚠️ فروشگاه خالی است.');
  }

  const player = await getOrCreatePlayer(ctx.from);

  let message = `🛒 **فروشگاه قهرمانان EPWR**\n\n💰 موجودی شما: ${player.gold.toLocaleString()} Gold | 💎 ${player.gems} Gems\n\n`;

  const buttons = [];
  characters.forEach((char, idx) => {
    const priceText = char.price_gold > 0 
      ? `💰 ${char.price_gold.toLocaleString()}`
      : `💎 ${char.price_gems}`;
    
    message += `${rarityEmoji(char.rarity)} **${char.name}** _(${rarityName(char.rarity)})_\n`;
    message += `   ❤ ${char.base_health} | 🗡 ${char.base_attack} | 🛡 ${char.base_defense}\n`;
    message += `   💵 قیمت: ${priceText}\n\n`;

    buttons.push([{
      text: `خرید ${char.name} (${priceText})`,
      callback_data: `buy:${char.id}`
    }]);
  });

  buttons.push([
    { text: '👥 قهرمانان من', callback_data: 'myheroes' },
    { text: '🔙 بازگشت', callback_data: 'mainmenu' }
  ]);

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

async function buyCharacter(ctx, templateId) {
  const db = getSupabase();
  const telegramId = ctx.from.id;

  const { data: template } = await db
    .from('character_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (!template) {
    return ctx.answerCbQuery('❌ شخصیت پیدا نشد!', { show_alert: true });
  }

  const { data: player } = await db
    .from('players')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  // بررسی موجودی
  if (template.price_gold > 0 && player.gold < template.price_gold) {
    return ctx.answerCbQuery(`❌ Gold کافی نداری! نیاز: ${template.price_gold}`, { show_alert: true });
  }
  if (template.price_gems > 0 && player.gems < template.price_gems) {
    return ctx.answerCbQuery(`❌ Gems کافی نداری! نیاز: ${template.price_gems}`, { show_alert: true });
  }

  // کم کردن پول
  const updates = {};
  if (template.price_gold > 0) updates.gold = player.gold - template.price_gold;
  if (template.price_gems > 0) updates.gems = player.gems - template.price_gems;
  
  await db.from('players').update(updates).eq('telegram_id', telegramId);

  // اضافه کردن شخصیت
  const { error: insertErr } = await db.from('player_characters').insert({
    telegram_id: telegramId,
    template_id: templateId,
    level: 1,
    current_health: template.base_health,
    xp: 0,
    is_equipped: false
  });

  if (insertErr) {
    return ctx.answerCbQuery('❌ خطا در خرید!', { show_alert: true });
  }

  await ctx.answerCbQuery(`✅ ${template.name} خریداری شد!`, { show_alert: true });
  await ctx.editMessageText(
    `🎉 **مبارک!**\n\n${rarityEmoji(template.rarity)} **${template.name}** به ارتش شما پیوست!\n\n❤️ سلامتی: ${template.base_health}\n🗡 حمله: ${template.base_attack}\n🛡 دفاع: ${template.base_defense}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '👥 دیدن قهرمانان', callback_data: 'myheroes' }],
          [{ text: '🛒 ادامه خرید', callback_data: 'shop' }],
          [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
        ]
      }
    }
  );
}

async function showMyHeroes(ctx) {
  const db = getSupabase();
  const telegramId = ctx.from.id;

  const { data: heroes, error } = await db
    .from('player_characters')
    .select(`
      id,
      level,
      current_health,
      xp,
      is_equipped,
      template:character_templates (
        id, name, type, base_health, base_attack, base_defense, rarity, image_url, description
      )
    `)
    .eq('telegram_id', telegramId)
    .order('acquired_at', { ascending: false });

  if (error) {
    console.error('MyHeroes error:', error);
    return ctx.reply('⚠️ خطا در دریافت قهرمانان.');
  }

  if (!heroes || heroes.length === 0) {
    return ctx.reply(
      `👥 **قهرمانان من**\n\nهنوز هیچ قهرمانی نداری!\n\nاز فروشگاه شروع کن:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 رفتن به فروشگاه', callback_data: 'shop' }],
            [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
          ]
        }
      }
    );
  }

  let message = `👥 **قهرمانان من** _(تعداد: ${heroes.length})_\n\n`;
  const buttons = [];

  heroes.forEach(hero => {
    const t = hero.template;
    const equipped = hero.is_equipped ? ' ✅' : '';
    message += `${rarityEmoji(t.rarity)} **${t.name}** _Lv.${hero.level}_${equipped}\n`;
    message += `   ❤ ${hero.current_health}/${t.base_health * hero.level} | 🗡 ${t.base_attack} | 🛡 ${t.base_defense}\n\n`;

    buttons.push([{
      text: `${hero.is_equipped ? '✅' : '⚔️'} ${t.name}`,
      callback_data: `hero:${hero.id}`
    }]);
  });

  buttons.push([
    { text: '🛒 فروشگاه', callback_data: 'shop' },
    { text: '🔙 بازگشت', callback_data: 'mainmenu' }
  ]);

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

async function showHeroDetails(ctx, heroId) {
  const db = getSupabase();

  const { data: hero, error } = await db
    .from('player_characters')
    .select(`
      id, level, current_health, xp, is_equipped,
      template:character_templates (
        id, name, type, base_health, base_attack, base_defense, rarity, image_url, description
      )
    `)
    .eq('id', heroId)
    .single();

  if (error || !hero) {
    return ctx.answerCbQuery('❌ قهرمان پیدا نشد', { show_alert: true });
  }

  const t = hero.template;
  const maxHp = t.base_health * hero.level;
  
  let message = `${rarityEmoji(t.rarity)} **${t.name}** _(${rarityName(t.rarity)})_\n\n`;
  message += `📖 ${t.description}\n\n`;
  message += `⭐ سطح: ${hero.level}\n`;
  message += `❤ سلامتی: ${hero.current_health}/${maxHp}\n`;
  message += `🗡 حمله: ${t.base_attack + (hero.level - 1) * 2}\n`;
  message += `🛡 دفاع: ${t.base_defense + (hero.level - 1) * 2}\n`;
  message += `✨ XP: ${hero.xp}\n`;

  const buttons = [];
  if (!hero.is_equipped) {
    buttons.push([{ text: '⚔️ تجهیز کردن', callback_data: `equip:${hero.id}` }]);
  } else {
    buttons.push([{ text: '🚫 غیرفعال کردن', callback_data: `unequip:${hero.id}` }]);
  }
  buttons.push([
    { text: '👥 لیست قهرمانان', callback_data: 'myheroes' },
    { text: '🔙 بازگشت', callback_data: 'mainmenu' }
  ]);

  // اگه عکس داشت، بفرست
  if (t.image_url) {
    try {
      await ctx.replyWithPhoto(t.image_url, {
        caption: message,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
      });
    }
  } else {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }
}

async function equipHero(ctx, heroId, equip) {
  const db = getSupabase();
  const telegramId = ctx.from.id;

  if (equip) {
    // اول همه رو غیرفعال کن
    await db.from('player_characters')
      .update({ is_equipped: false })
      .eq('telegram_id', telegramId);
    // بعد اینو فعال کن
    await db.from('player_characters')
      .update({ is_equipped: true })
      .eq('id', heroId);
    await ctx.answerCbQuery('✅ قهرمان تجهیز شد!', { show_alert: true });
  } else {
    await db.from('player_characters')
      .update({ is_equipped: false })
      .eq('id', heroId);
    await ctx.answerCbQuery('🚫 قهرمان غیرفعال شد', { show_alert: true });
  }

  await showMyHeroes(ctx);
}

// ═══════════════════════════════════════
// راه‌اندازی ربات
// ═══════════════════════════════════════

async function getBot() {
  if (botInstance) return botInstance;
  
  botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  
  botInstance.catch((err, ctx) => {
    console.error(`Error in ${ctx.updateType}:`, err);
    ctx.reply('⚠️ خطایی رخ داد.');
  });

  const mainMenuKb = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏰 قلمرو', callback_data: 'realm' }, { text: '⚔️ ارتش', callback_data: 'army' }],
        [{ text: '👥 قهرمانان', callback_data: 'myheroes' }, { text: '🛒 فروشگاه', callback_data: 'shop' }],
        [{ text: '🗺️ جهان', callback_data: 'world' }, { text: '💰 منابع', callback_data: 'resources' }],
        [{ text: '🏆 رتبه‌بندی', callback_data: 'ranking' }, { text: '🤝 اتحاد', callback_data: 'alliance' }],
        [{ text: '⚙️ تنظیمات', callback_data: 'settings' }]
      ]
    }
  };

  // /start
  botInstance.start(async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      await ctx.reply(
        `⚔️ *به EPWR خوش آمدی!*\n\n👑 فرمانده: ${player.commander_name}\n🏰 قلمرو: ${player.realm_name}\n⭐ سطح: ${player.level}\n\n💰 ${player.gold.toLocaleString()} Gold\n💎 ${player.gems} Gems\n\nآماده‌ای برای نبرد حماسی؟`,
        { parse_mode: 'Markdown', ...mainMenuKb }
      );
    } catch (e) {
      console.error('Start error:', e);
      ctx.reply('⚠️ خطا: ' + e.message);
    }
  });

  botInstance.command('profile', async (ctx) => {
    try {
      const player = await getOrCreatePlayer(ctx.from);
      await ctx.reply(
        `👑 *پروفایل*\n\n🆔 ${player.telegram_id}\n👤 ${player.commander_name}\n🏰 ${player.realm_name}\n⭐ Lv ${player.level}\n\n💰 ${player.gold.toLocaleString()}\n💎 ${player.gems}\n🍖 ${player.food.toLocaleString()}\n🪵 ${player.wood.toLocaleString()}\n🪨 ${player.stone.toLocaleString()}\n⚙️ ${player.iron.toLocaleString()}`,
        { parse_mode: 'Markdown', ...mainMenuKb }
      );
    } catch (e) {
      ctx.reply('⚠️ خطا: ' + e.message);
    }
  });

  botInstance.command('shop', async (ctx) => {
    try { await showShop(ctx); }
    catch (e) { ctx.reply('⚠️ خطا: ' + e.message); }
  });

  botInstance.command('myheroes', async (ctx) => {
    try { await showMyHeroes(ctx); }
    catch (e) { ctx.reply('⚠️ خطا: ' + e.message); }
  });

  botInstance.command('help', async (ctx) => {
    await ctx.reply(
      `⚔️ *راهنما*\n\n/start - شروع\n/profile - پروفایل\n/shop - فروشگاه قهرمانان\n/myheroes - قهرمانان من\n/help - راهنما`,
      { parse_mode: 'Markdown' }
    );
  });

  // ═══════════════════════════════════════
  // Callback ها
  // ═══════════════════════════════════════

  botInstance.action('mainmenu', async (ctx) => {
    await ctx.answerCbQuery();
    const player = await getOrCreatePlayer(ctx.from);
    await ctx.editMessageText(
      `⚔️ *منوی اصلی*\n\n👑 ${player.commander_name}\n💰 ${player.gold.toLocaleString()} | 💎 ${player.gems}`,
      { parse_mode: 'Markdown', ...mainMenuKb }
    );
  });

  botInstance.action('shop', async (ctx) => {
    await ctx.answerCbQuery();
    await showShop(ctx);
  });

  botInstance.action('myheroes', async (ctx) => {
    await ctx.answerCbQuery();
    await showMyHeroes(ctx);
  });

  botInstance.action(/^buy:(\d+)$/, async (ctx) => {
    const templateId = parseInt(ctx.match[1]);
    await buyCharacter(ctx, templateId);
  });

  botInstance.action(/^hero:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showHeroDetails(ctx, ctx.match[1]);
  });

  botInstance.action(/^equip:(.+)$/, async (ctx) => {
    await equipHero(ctx, ctx.match[1], true);
  });

  botInstance.action(/^unequip:(.+)$/, async (ctx) => {
    await equipHero(ctx, ctx.match[1], false);
  });

  // Callback های موقت
  const placeholders = ['realm', 'army', 'world', 'resources', 'ranking', 'alliance', 'settings'];
  placeholders.forEach(key => {
    botInstance.action(key, async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(`🚧 این بخش به زودی اضافه می‌شود!`);
    });
  });

  return botInstance;
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