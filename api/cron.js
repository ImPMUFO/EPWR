const { getSupabase } = require('../src/core/supabase');

// ═══ تابع تولید خودکار (درون‌خطی برای جلوگیری از مشکل require) ═══
async function processProduction(telegramId) {
  const db = getSupabase();
  const now = Date.now();
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if (!player || !player.last_prod_tick) {
    if (player && !player.last_prod_tick) {
      await db.from('players').update({ last_prod_tick: new Date(now).toISOString() }).eq('telegram_id', telegramId);
    }
    return;
  }

  const last = new Date(player.last_prod_tick).getTime();
  const elapsedMs = now - last;
  if (elapsedMs < 60000) return;
  const min = Math.floor(elapsedMs / 60000);
  const remainder = elapsedMs % 60000;

  const updates = {};

  // ⚙️ دستگاه سکه‌ساز
  const { data: items } = await db.from('player_items')
    .select('id, item:shop_items (type, effect_value)')
    .eq('telegram_id', telegramId).eq('is_active', true);
  const gen = (items || []).find(i => i.item && i.item.type === 'generator');
  if (gen) updates.gold = (player.gold || 0) + min * (gen.item.effect_value || 1);

  // 🍳 آشپزخانه (1 غذا هر 20 دقیقه هر سطح)
  const { data: kitchen } = await db.from('buildings').select('level').eq('telegram_id', telegramId).eq('type', 'kitchen').maybeSingle();
  if (kitchen) {
    const prog = (player.food_progress || 0) + min * 0.05 * kitchen.level;
    const add = Math.floor(prog);
    updates.food_progress = prog - add;
    if (add > 0) updates.food = Math.min((player.food || 0) + add, player.food_capacity || 1000);
  }

  // 🐔 مرغداری
  const { data: chicken } = await db.from('buildings').select('level').eq('telegram_id', telegramId).eq('type', 'chicken').maybeSingle();
  if (chicken) {
    const prog = (player.egg_progress || 0) + min * 0.1 * chicken.level;
    const add = Math.floor(prog);
    updates.egg_progress = prog - add;
    if (add > 0) updates.eggs = (player.eggs || 0) + add;
  }

  // 🌾 مزرعه
  const { data: farm } = await db.from('buildings').select('level').eq('telegram_id', telegramId).eq('type', 'farm').maybeSingle();
  if (farm) {
    const prog = (player.wheat_progress || 0) + min * (1 / 30) * farm.level;
    const add = Math.floor(prog);
    updates.wheat_progress = prog - add;
    if (add > 0) updates.wheat = (player.wheat || 0) + add;
  }

  updates.last_prod_tick = new Date(now - remainder).toISOString();
  await db.from('players').update(updates).eq('telegram_id', telegramId);
}

// ═══ Handler ═══
module.exports = async (req, res) => {
  const start = Date.now();
  try {
    // ═══ تایید مالکیت (فقط Vercel یا ادمین) ═══
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const db = getSupabase();
    const { data: players } = await db.from('players').select('telegram_id');
    let n = 0;
    for (const p of players || []) {
      if (Date.now() - start > 8000) break;
      try { await processProduction(p.telegram_id); n++; } catch(e) { console.error('prod err:', e.message); }
    }
    res.status(200).json({ ok: true, processed: n, ms: Date.now() - start });
  } catch (e) {
    console.error('cron err:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
};