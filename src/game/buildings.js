const { getSupabase } = require('../core/supabase');

const BUILDINGS = {
  castle: {
    name: '🏰 قلعه',
    desc: 'دفاع قلمرو +20%',
    cost: { wood: 200, stone: 300 },
    bonus: { defense: 20 }
  },
  tower: {
    name: '🏹 برج کمانداران',
    desc: 'قدرت حمله +10%',
    cost: { wood: 150, stone: 200 },
    bonus: { attack: 10 }
  },
  farm: {
    name: '🌾 مزرعه',
    desc: 'ظرفیت غذا +500',
    cost: { wood: 100, gold: 200 },
    bonus: { food_capacity: 500 }
  },
  forge: {
    name: '⚒️ آهنگری',
    desc: 'قدرت قهرمانان +15%',
    cost: { iron: 200, gold: 500 },
    bonus: { attack: 15 }
  },
  barracks: {
    name: '⚔️ پادگان',
    desc: 'ظرفیت قهرمان +2',
    cost: { wood: 250, stone: 150, gold: 300 },
    bonus: { hero_capacity: 2 }
  }
};

async function getBuildings(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('buildings').select('*').eq('telegram_id', telegramId);
  return data || [];
}

async function hasBuilding(telegramId, type) {
  const db = getSupabase();
  const { data } = await db.from('buildings').select('id').eq('telegram_id', telegramId).eq('type', type).maybeSingle();
  return !!data;
}

async function buildBuilding(telegramId, type) {
  const db = getSupabase();
  const building = BUILDINGS[type];
  if (!building) return { success: false, message: '❌ ساختمان پیدا نشد!' };

  const alreadyBuilt = await hasBuilding(telegramId, type);
  if (alreadyBuilt) return { success: false, message: '❌ قبلاً ساخته شده!' };

  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();

  // بررسی هزینه‌ها
  for (const [resource, amount] of Object.entries(building.cost)) {
    if ((player[resource] || 0) < amount) {
      return { success: false, message: `❌ ${resource} کافی نداری! نیاز: ${amount}` };
    }
  }

  // کسر هزینه‌ها
  const updates = {};
  for (const [resource, amount] of Object.entries(building.cost)) {
    updates[resource] = (player[resource] || 0) - amount;
  }

  if (building.bonus.food_capacity) {
    updates.food_capacity = (player.food_capacity || 1000) + building.bonus.food_capacity;
  }

  await db.from('players').update(updates).eq('telegram_id', telegramId);
  await db.from('buildings').insert({ telegram_id: telegramId, type });

  return { success: true, building };
}

async function getDefenseBonus(telegramId) {
  const db = getSupabase();
  const { data: buildings } = await db.from('buildings').select('type').eq('telegram_id', telegramId);
  let bonus = 0;
  for (const b of buildings || []) {
    const building = BUILDINGS[b.type];
    if (building && building.bonus.defense) bonus += building.bonus.defense;
  }
  return bonus;
}

async function getAttackBonus(telegramId) {
  const db = getSupabase();
  const { data: buildings } = await db.from('buildings').select('type').eq('telegram_id', telegramId);
  let bonus = 0;
  for (const b of buildings || []) {
    const building = BUILDINGS[b.type];
    if (building && building.bonus.attack) bonus += building.bonus.attack;
  }
  return bonus;
}

module.exports = { BUILDINGS, getBuildings, hasBuilding, buildBuilding, getDefenseBonus, getAttackBonus };