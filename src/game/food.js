const { getSupabase } = require('../core/supabase');
const { addNotification } = require('./notification');

const FOOD_PER_HERO_PER_DAY = 10;

async function processFoodConsumption(telegramId) {
  const db = getSupabase();
  const now = new Date();
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if (!player) return;

  const lastTick = new Date(player.last_food_tick || now);
  const hoursPassed = Math.floor((now - lastTick) / (1000 * 60 * 60));
  if (hoursPassed < 24) return;

  // سقف ۷ روز تا یه غیبت طولانی کل ارتش رو یکجا نابود نکنه
  const daysPassed = Math.min(Math.floor(hoursPassed / 24), 7);

  const { data: heroes } = await db.from('player_characters')
    .select('id, current_health, template:character_templates (name)')
    .eq('telegram_id', telegramId).gt('current_health', 0);

  if (!heroes || heroes.length === 0) {
    await db.from('players').update({ last_food_tick: now.toISOString() }).eq('telegram_id', telegramId);
    return;
  }

  const totalNeeded = heroes.length * FOOD_PER_HERO_PER_DAY * daysPassed;
  const available = player.food || 0;

  if (available >= totalNeeded) {
    await db.from('players').update({ food: available - totalNeeded, last_food_tick: now.toISOString() }).eq('telegram_id', telegramId);
    return;
  }

  const ratio = totalNeeded > 0 ? available / totalNeeded : 1;
  const damage = Math.floor(20 * (1 - ratio) * daysPassed);
  const dead = [];

  if (damage > 0) {
    for (const h of heroes) {
      const newHp = h.current_health - damage;
      if (newHp <= 0) {
        await db.from('player_characters').delete().eq('id', h.id);
        dead.push(h.template.name);
      } else {
        await db.from('player_characters').update({ current_health: newHp }).eq('id', h.id);
      }
    }
  }

  await db.from('players').update({ food: 0, last_food_tick: now.toISOString() }).eq('telegram_id', telegramId);

  if (dead.length > 0) {
    await addNotification(telegramId, 'starve', `☠️ قهرمان‌هات از گرسنگی مردن: ${dead.join('، ')}`, null, 0);
  } else if (damage > 0) {
    await addNotification(telegramId, 'starve', `🍖 قهرمان‌هات گشنه موندن و ضعیف شدن! (-${damage} ❤)`, null, 0);
  }
}

async function buyFood(telegramId, amount) {
  const db = getSupabase();
  const cost = amount;
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if (player.gold < cost) return { success: false, message: `❌ Gold کافی نداری! نیاز: ${cost}` };
  const newFood = Math.min((player.food || 0) + amount, player.food_capacity || 1000);
  await db.from('players').update({ gold: player.gold - cost, food: newFood }).eq('telegram_id', telegramId);
  return { success: true };
}

module.exports = { FOOD_PER_HERO_PER_DAY, processFoodConsumption, buyFood };