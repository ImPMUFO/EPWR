const { getSupabase } = require('../core/supabase');

const BUILDINGS = {
  castle: { name: '🏰 قلعه', desc: 'دفاع قلمرو +20 هر سطح', base_cost: { wood: 200, stone: 300 }, bonus: { defense: 20 }, max_level: 5 },
  wall: { name: '🧱 دیوار', desc: 'دفاع قلمرو +30 هر سطح', base_cost: { stone: 400, wood: 100 }, bonus: { defense: 30 }, max_level: 5 },
  watchtower: { name: '🗼 برج دیدبانی', desc: 'دفاع قلمرو +25 هر سطح', base_cost: { wood: 200, stone: 250 }, bonus: { defense: 25 }, max_level: 5 },
  tower: { name: '🏹 برج کمانداران', desc: 'قدرت حمله +10 هر سطح', base_cost: { wood: 150, stone: 200 }, bonus: { attack: 10 }, max_level: 5 },
  farm: { name: '🌾 مزرعه', desc: 'ظرفیت غذا +500 و 1 گندم هر 30 دقیقه هر سطح', base_cost: { wood: 100, gold: 200 }, bonus: { food_capacity: 500 }, max_level: 5 },
  forge: { name: '⚒️ آهنگری', desc: 'قدرت قهرمانان +15 هر سطح', base_cost: { iron: 200, gold: 500 }, bonus: { attack: 15 }, max_level: 5 },
  barracks: { name: '⚔️ پادگان', desc: 'استراحت قهرمان‌ها | هر سطح قهرمان‌های قوی‌تر', base_cost: { wood: 250, stone: 150, gold: 300 }, bonus: { hero_capacity: 2 }, max_level: 5 },
  kitchen: { name: '🍳 آشپزخانه', desc: '1 غذا هر 20 دقیقه هر سطح', base_cost: { wood: 150, gold: 250 }, bonus: { food_per_day: 20 }, max_level: 5 },
  chicken: { name: '🐔 مرغداری', desc: '1 تخم مرغ هر ساعت هر سطح', base_cost: { wood: 100, gold: 150 }, bonus: { eggs_per_day: 5 }, max_level: 5 }
};

async function getBuildings(telegramId) { const db = getSupabase(); const { data } = await db.from('buildings').select('*').eq('telegram_id', telegramId); return data || []; }
async function getBuilding(telegramId, type) { const db = getSupabase(); const { data } = await db.from('buildings').select('*').eq('telegram_id', telegramId).eq('type', type).maybeSingle(); return data; }

async function buildBuilding(telegramId, type) {
  const db = getSupabase();
  const building = BUILDINGS[type];
  if (!building) return { success: false, message: '❌ ساختمان پیدا نشد!' };
  const existing = await getBuilding(telegramId, type);
  if (existing) return { success: false, message: '❌ قبلاً ساخته شده!' };
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  for (const [r, a] of Object.entries(building.base_cost)) if ((player[r] || 0) < a) return { success: false, message: `❌ ${getResName(r)} کافی نداری! نیاز: ${a}` };
  const updates = {};
  for (const [r, a] of Object.entries(building.base_cost)) updates[r] = (player[r] || 0) - a;
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
  const cost = {};
  for (const [r, a] of Object.entries(building.base_cost)) cost[r] = Math.floor(a * (1 + existing.level * 0.5));
  for (const [r, a] of Object.entries(cost)) if ((player[r] || 0) < a) return { success: false, message: `❌ ${getResName(r)} کافی نداری! نیاز: ${a}` };
  const updates = {};
  for (const [r, a] of Object.entries(cost)) updates[r] = (player[r] || 0) - a;
  if (building.bonus.food_capacity) updates.food_capacity = (player.food_capacity || 1000) + building.bonus.food_capacity;
  await db.from('players').update(updates).eq('telegram_id', telegramId);
  await db.from('buildings').update({ level: existing.level + 1 }).eq('id', existing.id);
  return { success: true, newLevel: existing.level + 1 };
}

async function getDefenseBonus(telegramId) { const b = await getBuildings(telegramId); let s = 0; for (const x of b) { const d = BUILDINGS[x.type]; if (d && d.bonus.defense) s += d.bonus.defense * x.level; } return s; }
async function getAttackBonus(telegramId) { const b = await getBuildings(telegramId); let s = 0; for (const x of b) { const d = BUILDINGS[x.type]; if (d && d.bonus.attack) s += d.bonus.attack * x.level; } return s; }

// ═══ تولید خودکار دقیقه‌ای ═══
async function processKitchenProduction(telegramId) {
  const db = getSupabase();
  const now = Date.now();
  const zeros = { gold: 0, eggs: 0, food: 0, wheat: 0 };
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if (!player) return zeros;

  if (!player.last_prod_tick) {
    await db.from('players').update({ last_prod_tick: new Date(now).toISOString() }).eq('telegram_id', telegramId);
    return zeros;
  }

  const last = new Date(player.last_prod_tick).getTime();
  const elapsedMs = now - last;
  if (elapsedMs < 60000) return zeros;
  const min = Math.floor(elapsedMs / 60000);
  const remainder = elapsedMs % 60000;

  const updates = {};
  const out = { gold: 0, eggs: 0, food: 0, wheat: 0 };

  // ⚙️ دستگاه سکه‌ساز: 600 سکه در روز
  const { data: items } = await db.from('player_items').select('id, item:shop_items (type, effect_value)').eq('telegram_id', telegramId).eq('is_active', true);
  const gen = (items || []).find(i => i.item && i.item.type === 'generator');
  if (gen) {
    const ratePerMin = (gen.item.effect_value || 600) / 1440;
    const prog = (player.gold_progress || 0) + min * ratePerMin;
    const add = Math.floor(prog);
    out.gold = add; updates.gold_progress = prog - add;
    if (add > 0) updates.gold = (player.gold || 0) + add;
  }

  // 🍳 آشپزخانه: 1 غذا هر 20 دقیقه هر سطح
  const kitchen = await getBuilding(telegramId, 'kitchen');
  if (kitchen) {
    const prog = (player.food_progress || 0) + min * 0.05 * kitchen.level;
    const add = Math.floor(prog);
    out.food = add; updates.food_progress = prog - add;
    if (add > 0) updates.food = Math.min((player.food || 0) + add, player.food_capacity || 1000);
  }

  // 🐔 مرغداری: 1 تخم مرغ هر ساعت هر سطح (کاهش یافت)
  const chicken = await getBuilding(telegramId, 'chicken');
  if (chicken) {
    const prog = (player.egg_progress || 0) + min * (1 / 60) * chicken.level;
    const add = Math.floor(prog);
    out.eggs = add; updates.egg_progress = prog - add;
    if (add > 0) updates.eggs = (player.eggs || 0) + add;
  }

  // 🌾 مزرعه: 1 گندم هر 30 دقیقه هر سطح
  const farm = await getBuilding(telegramId, 'farm');
  if (farm) {
    const prog = (player.wheat_progress || 0) + min * (1 / 30) * farm.level;
    const add = Math.floor(prog);
    out.wheat = add; updates.wheat_progress = prog - add;
    if (add > 0) updates.wheat = (player.wheat || 0) + add;
  }

  updates.last_prod_tick = new Date(now - remainder).toISOString();
  await db.from('players').update(updates).eq('telegram_id', telegramId);
  return out;
}

async function craftFlour(telegramId) { const db = getSupabase(); const { data: p } = await db.from('players').select('*').eq('telegram_id', telegramId).single(); if ((p.wheat || 0) < 10) return { success: false, message: '❌ به 10 گندم نیاز داری!' }; await db.from('players').update({ wheat: p.wheat - 10, flour: (p.flour || 0) + 5 }).eq('telegram_id', telegramId); return { success: true }; }
async function craftBread(telegramId) { const db = getSupabase(); const { data: p } = await db.from('players').select('*').eq('telegram_id', telegramId).single(); if ((p.flour || 0) < 5) return { success: false, message: '❌ به 5 آرد نیاز داری!' }; await db.from('players').update({ flour: p.flour - 5, bread: (p.bread || 0) + 5 }).eq('telegram_id', telegramId); return { success: true }; }
async function eatBread(telegramId) { const db = getSupabase(); const { data: p } = await db.from('players').select('*').eq('telegram_id', telegramId).single(); if ((p.bread || 0) < 1) return { success: false, message: '❌ نان نداری!' }; await db.from('players').update({ bread: p.bread - 1, food: Math.min((p.food || 0) + 100, p.food_capacity || 1000) }).eq('telegram_id', telegramId); return { success: true }; }

function getResName(r) { return { gold: '💰 سکه', wood: '🪵 چوب', stone: '🪨 سنگ', iron: '⚙️ آهن', food: '🍖 غذا' }[r] || r; }

module.exports = { BUILDINGS, getBuildings, getBuilding, buildBuilding, upgradeBuilding, getDefenseBonus, getAttackBonus, processKitchenProduction, craftFlour, craftBread, eatBread, getResName };