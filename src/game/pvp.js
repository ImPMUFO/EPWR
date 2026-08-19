const { getSupabase } = require('../core/supabase');
const { getPlayerHeroes } = require('./battle');

async function findPvPTargets(attackerId) {
  const db = getSupabase();
  const { data: players } = await db.from('players')
    .select('telegram_id, commander_name, level, gold')
    .neq('telegram_id', attackerId)
    .gt('level', 0)
    .limit(5);
  return players || [];
}

async function executePvP(attackerId, defenderId, selectedHeroIds) {
  const db = getSupabase();
  const allHeroes = await getPlayerHeroes(attackerId);
  const selected = allHeroes.filter(h => selectedHeroIds.includes(h.id));

  if (selected.length === 0) return { success: false, message: '❌ قهرمانی انتخاب نکردی!' };

  const defenderHeroes = await getPlayerHeroes(defenderId);
  const attackerPower = selected.reduce((s, h) => s + h.template.base_attack + h.template.base_defense + h.level * 5, 0) + Math.floor(Math.random() * 20);
  const defenderPower = defenderHeroes.length > 0
    ? defenderHeroes.slice(0, 3).reduce((s, h) => s + h.template.base_attack + h.template.base_defense + h.level * 5, 0) + Math.floor(Math.random() * 20)
    : 20 + Math.floor(Math.random() * 10);

  const attackerWins = attackerPower >= defenderPower;
  const winnerId = attackerWins ? attackerId : defenderId;

  const { data: defender } = await db.from('players').select('gold, commander_name').eq('telegram_id', defenderId).single();
  const goldStolen = attackerWins ? Math.min(Math.floor(defender.gold * 0.1), 500) : 0;

  if (attackerWins && goldStolen > 0) {
    const { data: attacker } = await db.from('players').select('gold').eq('telegram_id', attackerId).single();
    await db.from('players').update({ gold: defender.gold - goldStolen }).eq('telegram_id', defenderId);
    await db.from('players').update({ gold: attacker.gold + goldStolen }).eq('telegram_id', attackerId);
  }

  await db.from('pvp_battles').insert({
    attacker_id: attackerId, defender_id: defenderId,
    winner_id: winnerId, gold_stolen: goldStolen,
    attacker_power: attackerPower, defender_power: defenderPower
  });

  return {
    success: true, attackerWins, attackerPower, defenderPower,
    goldStolen, defenderName: defender.commander_name
  };
}

module.exports = { findPvPTargets, executePvP };