const { getSupabase } = require('../core/supabase');

const BUILDINGS = {
  castle: { name: '🏰 قلعه', desc: 'دفاع قلمرو +20% هر سطح', base_cost: { wood: 200, stone: 300 }, bonus: { defense: 20 }, max_level: 5 },
  wall: { name: '🧱 دیوار', desc: 'دفاع قلمرو +30% هر سطح', base_cost: { stone: 400, wood: 100 }, bonus: { defense: 30 }, max_level: 5 },
  watchtower: { name: '🗼 برج دیدبانی', desc: 'دفاع قلمرو +25% هر سطح', base_cost: { wood: 200, stone: 250 }, bonus: { defense: 25 }, max_level: 5 },
  tower: { name: '🏹 برج کمانداران', desc: 'قدرت حمله +10% هر سطح', base_cost: { wood: 150, stone: 200 }, bonus: { attack: 10 }, max_level: 5 },
  farm: { name: '🌾 مزرعه', desc: 'ظرفیت غذا +500 و 5 گندم در روز هر سطح', base_cost: { wood: 100, gold: 200 }, bonus: { food_capacity: 500, wheat_per_day: 5 }, max_level: 5 },
  forge: { name: '⚒️ آهنگری', desc: 'قدرت قهرمانان +15% هر سطح', base_cost: { iron: 200, gold: 500 }, bonus: { attack: 15 }, max_level: 5 },
  barracks: { name: '⚔️ پادگان', desc: 'ظرفیت قهرمان +2 هر سطح', base_cost: { wood: 250, stone: 150, gold: 300 }, bonus: { hero_capacity: 2 }, max_level: 3 },
  kitchen: { name: '🍳 آشپزخانه', desc: 'تولید 20 غذا در روز هر سطح', base_cost: { wood: 150, gold: 250 }, bonus: { food_per_day: 20 }, max_level: 5 },
  chicken: { name: '🐔 مرغداری', desc: 'تولید 5 تخم مرغ در روز هر سطح', base_cost: { wood: 100, gold: 150 }, bonus: { eggs_per_day: 5 }, max_level: 5 }
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
  for (const [resource, amount] of Object.entries(building.base_cost)) {
    if ((player[resource] || 0) < amount) return { success: false, message: `❌ ${getResName(resource)} کافی نداری! نیاز: ${amount}` };
  }
  const updates = {};
  for (const [resource, amount] of Object.entries(building.base_cost)) updates[resource] = (player[resource] || 0) - amount;
  if (building.bonus.food_capacity) updates.food_capacity = (player.food_capacity || 1000) + building.bonus.food_capacity;
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
  if (existing.level >= building.max_level) return { success: false, message: `❌ حداکثر سطح ${building.max_level}!` };
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  const upgradeCost = {};
  for (const [resource, amount] of Object.entries(building.base_cost)) upgradeCost[resource] = Math.floor(amount * (1 + existing.level * 0.5));
  for (const [resource, amount] of Object.entries(upgradeCost)) {
    if ((player[resource] || 0) < amount) return { success: false, message: `❌ ${getResName(resource)} کافی نداری! نیاز: ${amount}` };
  }
  const updates = {};
  for (const [resource, amount] of Object.entries(upgradeCost)) updates[resource] = (player[resource] || 0) - amount;
  if (building.bonus.food_capacity) updates.food_capacity = (player.food_capacity || 1000) + building.bonus.food_capacity;
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

// ═══ تولید روزانه: غذا + تخم مرغ + گندم ═══
async function processKitchenProduction(telegramId) {
  const db = getSupabase();
  const now = new Date();
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if (!player) return 0;
  const lastTick = new Date(player.last_food_tick);
  const hoursPassed = Math.floor((now - lastTick) / (1000 * 60 * 60));
  if (hoursPassed < 24) return 0;
  const daysPassed = Math.floor(hoursPassed / 24);
  const updates = {};

  const kitchen = await getBuilding(telegramId, 'kitchen');
  if (kitchen) updates.food = Math.min((player.food || 0) + BUILDINGS.kitchen.bonus.food_per_day * kitchen.level * daysPassed, player.food_capacity || 1000);

  const chicken = await getBuilding(telegramId, 'chicken');
  if (chicken) updates.eggs = (player.eggs || 0) + BUILDINGS.chicken.bonus.eggs_per_day * chicken.level * daysPassed;

  const farm = await getBuilding(telegramId, 'farm');
  if (farm) updates.wheat = (player.wheat || 0) + BUILDINGS.farm.bonus.wheat_per_day * farm.level * daysPassed;

  if (Object.keys(updates).length > 0) await db.from('players').update(updates).eq('telegram_id', telegramId);
  return 0;
}

// ═══ زنجیره تولید ═══
async function craftFlour(telegramId) {
  const db = getSupabase();
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if ((player.wheat || 0) < 10) return { success: false, message: '❌ به 10 گندم نیاز داری!' };
  await db.from('players').update({ wheat: player.wheat - 10, flour: (player.flour || 0) + 5 }).eq('telegram_id', telegramId);
  return { success: true };
}

async function craftBread(telegramId) {
  const db = getSupabase();
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if ((player.flour || 0) < 5) return { success: false, message: '❌ به 5 آرد نیاز داری!' };
  await db.from('players').update({ flour: player.flour - 5, bread: (player.bread || 0) + 5 }).eq('telegram_id', telegramId);
  return { success: true };
}

async function eatBread(telegramId) {
  const db = getSupabase();
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if ((player.bread || 0) < 1) return { success: false, message: '❌ نان نداری!' };
  await db.from('players').update({ bread: player.bread - 1, food: Math.min((player.food || 0) + 100, player.food_capacity || 1000) }).eq('telegram_id', telegramId);
  return { success: true };
}

function getResName(res) {
  return { gold: '💰 سکه', wood: '🪵 چوب', stone: '🪨 سنگ', iron: '⚙️ آهن', food: '🍖 غذا' }[res] || res;
}

module.exports = { BUILDINGS, getBuildings, getBuilding, buildBuilding, upgradeBuilding, getDefenseBonus, getAttackBonus, processKitchenProduction, craftFlour, craftBread, eatBread, getResName };