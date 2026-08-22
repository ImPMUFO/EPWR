const { getSupabase } = require('../core/supabase');

const SKINS = {
  none: { name: 'معمولی', emoji: '', price_gems: 0, bonus: {} },
  golden: { name: 'طلایی', emoji: '🌟', price_gems: 50, bonus: { defense: 5 } },
  ice: { name: 'یخی', emoji: '❄️', price_gems: 50, bonus: { health: 10 } },
  flame: { name: 'آتشین', emoji: '🔥', price_gems: 50, bonus: { attack: 5 } }
};

const WEAPONS = {
  none: { name: 'بدون سلاح', emoji: '', power: 0, cost_iron: 0 },
  sword: { name: 'شمشیر', emoji: '🗡️', power: 10, cost_iron: 50 },
  spear: { name: 'نیزه', emoji: '🔱', power: 8, cost_iron: 40 },
  axe: { name: 'تبر', emoji: '🪓', power: 15, cost_iron: 70 },
  bow: { name: 'کمان', emoji: '🏹', power: 12, cost_iron: 60 }
};

function skinBonus(skin) { return SKINS[skin]?.bonus || {}; }
function weaponPower(weapon) { return WEAPONS[weapon]?.power || 0; }

async function applySkin(telegramId, heroId, skinKey) {
  const db = getSupabase();
  const skin = SKINS[skinKey];
  if (!skin) return { success: false, message: '❌ اسکین پیدا نشد!' };
  const { data: player } = await db.from('players').select('gems').eq('telegram_id', telegramId).single();
  if (player.gems < skin.price_gems) return { success: false, message: `❌ الماس کافی نداری! نیاز: ${skin.price_gems}` };
  await db.from('players').update({ gems: player.gems - skin.price_gems }).eq('telegram_id', telegramId);
  await db.from('player_characters').update({ skin: skinKey }).eq('id', heroId);
  return { success: true };
}

async function equipWeapon(telegramId, heroId, weaponKey) {
  const db = getSupabase();
  const weapon = WEAPONS[weaponKey];
  if (!weapon) return { success: false, message: '❌ سلاح پیدا نشد!' };
  const { data: player } = await db.from('players').select('iron').eq('telegram_id', telegramId).single();
  if (player.iron < weapon.cost_iron) return { success: false, message: `❌ آهن کافی نداری! نیاز: ${weapon.cost_iron}` };
  await db.from('players').update({ iron: player.iron - weapon.cost_iron }).eq('telegram_id', telegramId);
  await db.from('player_characters').update({ weapon: weaponKey }).eq('id', heroId);
  return { success: true };
}

module.exports = { SKINS, WEAPONS, skinBonus, weaponPower, applySkin, equipWeapon };