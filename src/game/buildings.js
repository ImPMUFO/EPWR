const { getSupabase } = require('../core/supabase');

const BUILDINGS = {
  castle: {
    name: '🏰 قلعه',
    desc: 'دفاع قلمرو +20% هر سطح',
    base_cost: { wood: 200, stone: 300 },
    bonus: { defense: 20 },
    max_level: 5
  },
  tower: {
    name: '🏹 برج کمانداران',
    desc: 'قدرت حمله +10% هر سطح',
    base_cost: { wood: 150, stone: 200 },
    bonus: { attack: 10 },
    max_level: 5
  },
  farm: {
    name: '🌾 مزرعه',
    desc: 'ظرفیت غذا +500 هر سطح',
    base_cost: { wood: 100, gold: 200 },
    bonus: { food_capacity: 500 },
    max_level: 5
  },
  forge: {
    name: '⚒️ آهنگری',
    desc: 'قدرت قهرمانان +15% هر سطح',
    base_cost: { iron: 200, gold: 500 },
    bonus: { attack: 15 },
    max_level: 5
  },
  barracks: {
    name: '⚔️ پادگان',
    desc: 'ظرفیت قهرمان +2 هر سطح',
    base_cost: { wood: 250, stone: 150, gold: 300 },
    bonus: { hero_capacity: 2 },
    max_level: 3
  },
  kitchen: {
    name: '🍳 آشپزخانه',
    desc: 'تولید غذا: 20 در روز هر سطح',
    base_cost: { wood: 150, gold: 250 },
    bonus: { food_per_day: 20 },
    max_level: 5
  }
};

async function getBuildings(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('buildings').select('*').eq('telegram_id', telegramId);
  return data || [];
}

async function getBuilding(telegramId, type) {
  const db = getSupabase();
  const { data } = await db.from('buildings').select('*').eq('telegram_id', telegramId).eq('type', type).maybeSingle();
  return data;
}

async function buildBuilding(telegramId, type) {
  const db = getSupabase();
  const building = BUILDINGS[type];
  if (!building) return { success: false, message: '❌ ساختمان پیدا نشد!' };

  const existing = await getBuilding(telegramId, type);
  if (existing) return { success: false, message: '❌ قبلاً ساخته شده!' };

  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();

  // بررسی هزینه‌ها
  for (const [resource, amount] of Object.entries(building.base_cost)) {
    if ((player[resource] || 0) < amount) {
      return { success: false, message: `❌ ${getResName(resource)} کافی نداری! نیاز: ${amount}` };
    }
  }

  // کسر هزینه‌ها
  const updates = {};
  for (const [resource, amount] of Object.entries(building.base_cost)) {
    updates[resource] = (player[resource] || 0) - amount;
  }

  if (building.bonus.food_capacity) {
    updates.food_capacity = (player.food_capacity || 1000) + building.bonus.food_capacity;
  }

  await db.from('players').update(updates).eq('telegram_id', telegramId);
  await db.from('buildings').insert({ telegram_id: telegramId, type, level: 1 });

  return { success: true, building };
}

async function upgradeBuilding(telegramId, type) {
  const db = getSupabase();
  const building = BUILDINGS[type];
  if (!building) return { success: false, message: '❌ ساختمان پیدا نشد!' };

  const existing = await getBuilding(telegramId, type);
  if (!existing) return { success: false, message: '❌ اول بسازش!' };

  if (existing.level >= building.max_level) {
    return { success: false, message: `❌ حداکثر سطح ${building.max_level}!` };
  }

  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();

  // محاسبه هزینه ارتقا (هر سطح 50% بیشتر)
  const upgradeCost = {};
  for (const [resource, amount] of Object.entries(building.base_cost)) {
    upgradeCost[resource] = Math.floor(amount * (1 + existing.level * 0.5));
  }

  // بررسی هزینه‌ها
  for (const [resource, amount] of Object.entries(upgradeCost)) {
    if ((player[resource] || 0) < amount) {
      return { success: false, message: `❌ ${getResName(resource)} کافی نداری! نیاز: ${amount}` };
    }
  }

  // کسر هزینه‌ها
  const updates = {};
  for (const [resource, amount] of Object.entries(upgradeCost)) {
    updates[resource] = (player[resource] || 0) - amount;
  }

  if (building.bonus.food_capacity) {
    updates.food_capacity = (player.food_capacity || 1000) + building.bonus.food_capacity;
  }

  await db.from('players').update(updates).eq('telegram_id', telegramId);
  await db.from('buildings').update({ level: existing.level + 1 }).eq('id', existing.id);

  return { success: true, newLevel: existing.level + 1 };
}

async function getDefenseBonus(telegramId) {
  const buildings = await getBuildings(telegramId);
  let bonus = 0;
  for (const b of buildings) {
    const building = BUILDINGS[b.type];
    if (building && building.bonus.defense) bonus += building.bonus.defense * b.level;
  }
  return bonus;
}

async function getAttackBonus(telegramId) {
  const buildings = await getBuildings(telegramId);
  let bonus = 0;
  for (const b of buildings) {
    const building = BUILDINGS[b.type];
    if (building && building.bonus.attack) bonus += building.bonus.attack * b.level;
  }
  return bonus;
}

async function processKitchenProduction(telegramId) {
  const db = getSupabase();
  const kitchen = await getBuilding(telegramId, 'kitchen');
  if (!kitchen) return 0;

  const building = BUILDINGS.kitchen;
  const foodPerDay = building.bonus.food_per_day * kitchen.level;
  const now = new Date();

  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  const lastTick = new Date(player.last_food_tick);
  const hoursPassed = Math.floor((now - lastTick) / (1000 * 60 * 60));

  if (hoursPassed < 24) return 0;

  const daysPassed = Math.floor(hoursPassed / 24);
  const foodProduced = foodPerDay * daysPassed;
  const newFood = Math.min((player.food || 0) + foodProduced, player.food_capacity || 1000);

  await db.from('players').update({ food: newFood }).eq('telegram_id', telegramId);

  return foodProduced;
}

function getResName(res) {
  return { gold: '💰 سکه', wood: '🪵 چوب', stone: '🪨 سنگ', iron: '⚙️ آهن', food: '🍖 غذا' }[res] || res;
}

module.exports = { BUILDINGS, getBuildings, getBuilding, buildBuilding, upgradeBuilding, getDefenseBonus, getAttackBonus, processKitchenProduction, getResName };