const { getSupabase } = require('../core/supabase');
const { getAttackHeroes, getDefenderHeroes } = require('./battle');
const { getDefenseBonus } = require('./buildings');
const { troopsPower } = require('./troops');
const { addNotification } = require('./notification');
const { addPlayerXp, xpForActivity } = require('./xp');

async function findPvPTargets(attackerId) {
  const db = getSupabase();
  const { data } = await db.from('players')
    .select('telegram_id, commander_name, level, gold')
    .neq('telegram_id', attackerId).gt('level', 0).limit(5);
  return data || [];
}

function calcPower(heroes) {
  return heroes.reduce((s, h) =>
    s + h.template.base_attack + h.template.base_defense + h.level * 5 + troopsPower(h.troops_data), 0);
}

async function executePvP(attackerId, defenderId, selectedHeroIds) {
  const db = getSupabase();

  if (attackerId === defenderId) return { success: false, message: '❌ نمی‌تونی به خودت حمله کنی!' };

  const allHeroes = await getAttackHeroes(attackerId);
  const selected = allHeroes.filter(h => selectedHeroIds.includes(h.id));
  if (selected.length === 0) return { success: false, message: '❌ قهرمانی انتخاب نکردی!' };

  const defenderHeroes = await getDefenderHeroes(defenderId);
  const defBonus = await getDefenseBonus(defenderId);

  const attackerPower = calcPower(selected) + Math.floor(Math.random() * 20);
  const defenderPower = (defenderHeroes.length > 0 ? calcPower(defenderHeroes.slice(0, 3)) : 20) + defBonus + Math.floor(Math.random() * 20);

  const attackerWins = attackerPower >= defenderPower;
  const winnerId = attackerWins ? attackerId : defenderId;

  // ═══ دزدی سکه اتمیک (رفع Race Condition) ═══
  let goldStolen = 0;
  if (attackerWins) {
    const { data, error } = await db.rpc('steal_gold', { p_attacker: attackerId, p_defender: defenderId, p_max: 500 });
    if (!error && typeof data === 'number') goldStolen = data;
  }

  // ═══ آسیب رزمی به قهرمان‌های مهاجم ═══
  for (const hero of selected) {
    const damage = Math.floor(Math.random() * 15) + 5;
    const newHp = hero.current_health - damage;
    if (newHp <= 0) await db.from('player_characters').delete().eq('id', hero.id);
    else await db.from('player_characters').update({ current_health: newHp }).eq('id', hero.id);
  }

  // ═══ آسیب به قهرمان‌های دفاعی مدافع (فقط وقتی باخته) ═══
  if (attackerWins) {
    for (const dh of defenderHeroes.slice(0, 3)) {
      const damage = Math.floor(Math.random() * 20) + 10;
      const newHp = dh.current_health - damage;
      if (newHp <= 0) await db.from('player_characters').delete().eq('id', dh.id);
      else await db.from('player_characters').update({ current_health: newHp }).eq('id', dh.id);
    }
  }

  const { data: defender } = await db.from('players').select('gold, commander_name').eq('telegram_id', defenderId).single();
  const { data: attacker } = await db.from('players').select('gold, commander_name').eq('telegram_id', attackerId).single();

  await db.from('pvp_battles').insert({
    attacker_id: attackerId, defender_id: defenderId, winner_id: winnerId,
    gold_stolen: goldStolen, attacker_power: attackerPower, defender_power: defenderPower
  });

  await addPlayerXp(attackerId, xpForActivity(attackerWins ? 'pvp_win' : 'pvp_lose'));
  await addPlayerXp(defenderId, xpForActivity(attackerWins ? 'pvp_lose' : 'pvp_win'));

  if (attackerWins) {
    await addNotification(defenderId, 'attack', `${attacker.commander_name} به شما حمله کرد و پیروز شد!`, attacker.commander_name, goldStolen);
  } else {
    await addNotification(defenderId, 'defense', `شما حمله ${attacker.commander_name} را دفع کردید!`, attacker.commander_name, 0);
  }

  return { success: true, attackerWins, attackerPower, defenderPower, goldStolen, defenderName: defender.commander_name };
}

module.exports = { findPvPTargets, executePvP };