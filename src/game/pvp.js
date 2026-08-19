const { getSupabase } = require('../core/supabase');
const { getPlayerHeroes } = require('./battle');
const { addNotification } = require('./notification');
const { addPlayerXp, xpForActivity } = require('./xp');

async function findPvPTargets(attackerId) {
  const db = getSupabase();
  const { data } = await db.from('players')
    .select('telegram_id, commander_name, level, gold')
    .neq('telegram_id', attackerId)
    .gt('level', 0)
    .limit(5);
  return data || [];
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

  const { data: defender } = await db.from('players')
    .select('gold, commander_name').eq('telegram_id', defenderId).single();
  const { data: attacker } = await db.from('players')
    .select('gold, commander_name').eq('telegram_id', attackerId).single();

  const goldStolen = attackerWins ? Math.min(Math.floor(defender.gold * 0.1), 500) : 0;

  if (attackerWins && goldStolen > 0) {
    await db.from('players').update({ gold: defender.gold - goldStolen }).eq('telegram_id', defenderId);
    await db.from('players').update({ gold: attacker.gold + goldStolen }).eq('telegram_id', attackerId);
  }

  await db.from('pvp_battles').insert({
    attacker_id: attackerId, defender_id: defenderId, winner_id: winnerId,
    gold_stolen: goldStolen, attacker_power: attackerPower, defender_power: defenderPower
  });

  // ═══ XP برای هر دو ═══
  if (attackerWins) {
    await addPlayerXp(attackerId, xpForActivity('pvp_win'));
    await addPlayerXp(defenderId, xpForActivity('pvp_lose'));
  } else {
    await addPlayerXp(attackerId, xpForActivity('pvp_lose'));
    await addPlayerXp(defenderId, xpForActivity('pvp_win'));
  }

  // ═══ اعلان به مدافع ═══
  if (attackerWins) {
    await addNotification(
      defenderId,
      'attack',
      `${attacker.commander_name} به شما حمله کرد و پیروز شد!`,
      attacker.commander_name,
      goldStolen
    );
  } else {
    await addNotification(
      defenderId,
      'defense',
      `شما حمله ${attacker.commander_name} را دفع کردید!`,
      attacker.commander_name,
      0
    );
  }

  return {
    success: true, attackerWins, attackerPower, defenderPower,
    goldStolen, defenderName: defender.commander_name
  };
}

module.exports = { findPvPTargets, executePvP };