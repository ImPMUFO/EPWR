const { getSupabase } = require('../core/supabase');

async function getEquippedHero(telegramId) {
  const db = getSupabase();
  const { data } = await db
    .from('player_characters')
    .select(`
      id, level, current_health,
      template:character_templates (
        id, name, base_attack, base_defense, base_health
      )
    `)
    .eq('telegram_id', telegramId)
    .eq('is_equipped', true)
    .maybeSingle();

  return data;
}

function calculatePower(hero) {
  if (!hero) return 0;
  const t = hero.template;
  const basePower = t.base_attack + t.base_defense;
  const levelBonus = hero.level * 5;
  return basePower + levelBonus;
}

async function findOpponent(attackerId) {
  const db = getSupabase();
  const { data: opponents } = await db
    .from('players')
    .select('telegram_id, commander_name')
    .neq('telegram_id', attackerId)
    .limit(10);

  if (!opponents || opponents.length === 0) return null;
  const random = Math.floor(Math.random() * opponents.length);
  return opponents[random];
}

async function executeBattle(attackerId, defenderId) {
  const db = getSupabase();

  const attackerHero = await getEquippedHero(attackerId);
  const defenderHero = await getEquippedHero(defenderId);

  if (!attackerHero) {
    return { success: false, message: '❌ اول باید یک قهرمان تجهیز کنی!' };
  }
  if (!defenderHero) {
    return { success: false, message: '❌ حریف قهرمان تجهیز شده ندارد!' };
  }

  // محاسبه قدرت
  const attackerPower = calculatePower(attackerHero) + Math.floor(Math.random() * 10);
  const defenderPower = calculatePower(defenderHero) + Math.floor(Math.random() * 10);

  const attackerWins = attackerPower >= defenderPower;
  const winnerId = attackerWins ? attackerId : defenderId;
  const loserId = attackerWins ? defenderId : attackerId;

  // مقدار سکه دزدیده شده (بین 50 تا 200)
  const goldStolen = 50 + Math.floor(Math.random() * 151);

  // بررسی موجودی بازنده
  const { data: loser } = await db.from('players')
    .select('gold').eq('telegram_id', loserId).single();

  const actualGold = Math.min(goldStolen, loser.gold);

  // انتقال سکه
  const { data: winner } = await db.from('players')
    .select('gold').eq('telegram_id', winnerId).single();

  await db.from('players').update({ gold: loser.gold - actualGold })
    .eq('telegram_id', loserId);
  await db.from('players').update({ gold: winner.gold + actualGold })
    .eq('telegram_id', winnerId);

  // ذخیره تاریخچه جنگ
  await db.from('battles').insert({
    attacker_id: attackerId,
    defender_id: defenderId,
    attacker_hero_id: attackerHero.id,
    defender_hero_id: defenderHero.id,
    winner_id: winnerId,
    gold_stolen: actualGold,
    attacker_power: attackerPower,
    defender_power: defenderPower
  });

  return {
    success: true,
    attackerWins,
    winnerId,
    goldStolen: actualGold,
    attackerPower,
    defenderPower,
    attackerHero,
    defenderHero
  };
}

module.exports = { getEquippedHero, findOpponent, executeBattle };