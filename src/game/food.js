const { getSupabase } = require('../core/supabase');

const FOOD_PER_HERO_PER_DAY = 10;

async function processFoodConsumption(telegramId) {
  const db = getSupabase();
  const now = new Date();

  const { data: player } = await db.from('players')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (!player) return;

  const lastTick = new Date(player.last_food_tick);
  const hoursPassed = Math.floor((now - lastTick) / (1000 * 60 * 60));

  if (hoursPassed < 24) return;

  const daysPassed = Math.floor(hoursPassed / 24);
  const { data: heroes } = await db.from('player_characters')
    .select('id, current_health, level')
    .eq('telegram_id', telegramId)
    .gt('current_health', 0);

  if (!heroes || heroes.length === 0) {
    await db.from('players').update({ last_food_tick: now.toISOString() }).eq('telegram_id', telegramId);
    return;
  }

  const totalFoodNeeded = heroes.length * FOOD_PER_HERO_PER_DAY * daysPassed;
  const availableFood = player.food || 0;

  if (availableFood >= totalFoodNeeded) {
    await db.from('players').update({
      food: availableFood - totalFoodNeeded,
      last_food_tick: now.toISOString()
    }).eq('telegram_id', telegramId);
  } else {
    // غذا کمه، قهرمان‌ها آسیب می‌بینن
    const foodRatio = availableFood / totalFoodNeeded;
    const damageRatio = 1 - foodRatio;
    const damage = Math.floor(20 * damageRatio * daysPassed);

    if (damage > 0) {
      for (const hero of heroes) {
        const newHp = hero.current_health - damage;
        if (newHp <= 0) {
          await db.from('player_characters').delete().eq('id', hero.id);
        } else {
          await db.from('player_characters').update({ current_health: newHp }).eq('id', hero.id);
        }
      }
    }

    await db.from('players').update({
      food: 0,
      last_food_tick: now.toISOString()
    }).eq('telegram_id', telegramId);
  }
}

async function buyFood(telegramId, amount) {
  const db = getSupabase();
  const cost = amount;
  const { data: player } = await db.from('players')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (player.gold < cost) {
    return { success: false, message: `❌ Gold کافی نداری! نیاز: ${cost}` };
  }

  const newFood = Math.min((player.food || 0) + amount, player.food_capacity || 1000);
  await db.from('players').update({
    gold: player.gold - cost,
    food: newFood
  }).eq('telegram_id', telegramId);

  return { success: true };
}

module.exports = { FOOD_PER_HERO_PER_DAY, processFoodConsumption, buyFood };