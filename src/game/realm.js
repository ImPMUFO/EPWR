const { getSupabase } = require('../core/supabase');

async function collectGold(telegramId) {
  const db = getSupabase();
  const now = new Date();
  const { data: items } = await db
    .from('player_items')
    .select('id, item:shop_items (effect_value, name), last_collected_at, is_active')
    .eq('telegram_id', telegramId)
    .eq('is_active', true);
  let totalGold = 0;
  const details = [];
  for (const item of items || []) {
    const last = new Date(item.last_collected_at);
    const minutesPassed = Math.floor((now - last) / (1000 * 60));
    if (minutesPassed >= 10) {
      const cycles = Math.floor(minutesPassed / 10);
      const gold = item.item.effect_value * cycles;
      totalGold += gold;
      details.push(`${item.item.name}: ${gold}`);
      await db.from('player_items').update({ last_collected_at: now.toISOString() }).eq('id', item.id);
    }
  }
  if (totalGold > 0) {
    const { data: player } = await db.from('players').select('gold').eq('telegram_id', telegramId).single();
    await db.from('players').update({ gold: player.gold + totalGold }).eq('telegram_id', telegramId);
  }
  return { totalGold, details };
}

module.exports = { collectGold };