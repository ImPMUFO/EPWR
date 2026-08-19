const { getSupabase } = require('../core/supabase');

async function addPlayerXp(telegramId, amount) {
  const db = getSupabase();
  const { data: player } = await db.from('players')
    .select('xp, level, xp_to_next')
    .eq('telegram_id', telegramId)
    .single();

  if (!player) return { leveledUp: false };

  let newXp = (player.xp || 0) + amount;
  let newLevel = player.level;
  let xpToNext = player.xp_to_next || 100;
  let leveledUp = false;

  // لول آپ
  while (newXp >= xpToNext) {
    newXp -= xpToNext;
    newLevel += 1;
    xpToNext = Math.floor(xpToNext * 1.5);
    leveledUp = true;
  }

  await db.from('players').update({
    xp: newXp,
    level: newLevel,
    xp_to_next: xpToNext
  }).eq('telegram_id', telegramId);

  return { leveledUp, newLevel };
}

function xpForActivity(type) {
  const rewards = {
    'battle_win': 25,
    'battle_lose': 5,
    'pvp_win': 50,
    'pvp_lose': 10,
    'buy_hero': 15,
    'buy_item': 10,
    'quest_complete': 30,
    'daily_login': 5
  };
  return rewards[type] || 10;
}

module.exports = { addPlayerXp, xpForActivity };