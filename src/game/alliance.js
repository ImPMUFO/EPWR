const { getSupabase } = require('../core/supabase');

const MAX_MEMBERS_PER_LEVEL = { 1: 10, 2: 15, 3: 20, 4: 25, 5: 30 };

async function createAlliance(telegramId, name, tag, description) {
  const db = getSupabase();
  const { data: existing } = await db.from('alliance_members').select('alliance_id').eq('telegram_id', telegramId).maybeSingle();
  if (existing) return { success: false, message: '❌ قبلاً عضو اتحاد هستید!' };
  const { error } = await db.from('alliances').insert({ name, tag: tag.toUpperCase(), description, leader_id: telegramId });
  if (error) {
    if (error.code === '23505') return { success: false, message: '❌ این نام یا تگ قبلاً استفاده شده!' };
    return { success: false, message: '❌ خطا در ساخت اتحاد!' };
  }
  const { data: alliance } = await db.from('alliances').select('*').eq('tag', tag.toUpperCase()).single();
  await db.from('alliance_members').insert({ alliance_id: alliance.id, telegram_id: telegramId, role: 'leader' });
  return { success: true, alliance };
}

async function getPlayerAlliance(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('alliance_members')
    .select('alliance:alliances (id, name, tag, leader_id, treasury_gold, level, xp, xp_to_next), role')
    .eq('telegram_id', telegramId).maybeSingle();
  return data;
}

async function getAllAlliances() {
  const db = getSupabase();
  const { data } = await db.from('alliances').select('*').order('level', { ascending: false });
  return data || [];
}

async function getAllianceMembers(allianceId) {
  const db = getSupabase();
  const { data } = await db.from('alliance_members')
    .select('telegram_id, role, players (commander_name, level)')
    .eq('alliance_id', allianceId);
  return data || [];
}

async function requestJoin(telegramId, allianceId) {
  const db = getSupabase();
  const { data: existing } = await db.from('alliance_members').select('alliance_id').eq('telegram_id', telegramId).maybeSingle();
  if (existing) return { success: false, message: '❌ قبلاً عضو اتحاد هستید!' };
  const { error } = await db.from('alliance_join_requests').insert({ alliance_id: allianceId, telegram_id: telegramId });
  if (error) return { success: false, message: '❌ قبلاً درخواست داده‌اید!' };
  return { success: true };
}

async function leaveAlliance(telegramId) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };
  if (member.role === 'leader') return { success: false, message: '❌ رهبر نمی‌تواند اتحاد را ترک کند! اول رهبری رو منتقل کن.' };
  await db.from('alliance_members').delete().eq('telegram_id', telegramId);
  return { success: true };
}

async function depositToTreasury(telegramId, amount) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };

  const { data: player } = await db.from('players').select('gold').eq('telegram_id', telegramId).single();
  if (player.gold < amount) return { success: false, message: '❌ سکه کافی نداری!' };

  await db.from('players').update({ gold: player.gold - amount }).eq('telegram_id', telegramId);
  await db.from('alliances').update({ treasury_gold: (member.alliance.treasury_gold || 0) + amount }).eq('id', member.alliance.id);
  await db.from('alliances').update({ xp: (member.alliance.xp || 0) + Math.floor(amount / 10) }).eq('id', member.alliance.id);

  return { success: true };
}

async function upgradeAlliance(telegramId) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };
  if (member.role !== 'leader') return { success: false, message: '❌ فقط رهبر می‌تواند ارتقا دهد!' };

  const alliance = member.alliance;
  if (alliance.level >= 5) return { success: false, message: '❌ حداکثر سطح!' };

  const upgradeCost = alliance.level * 500;
  if ((alliance.treasury_gold || 0) < upgradeCost) {
    return { success: false, message: `❌ خزانه کافی نیست! نیاز: ${upgradeCost}` };
  }

  await db.from('alliances').update({
    level: alliance.level + 1,
    treasury_gold: alliance.treasury_gold - upgradeCost
  }).eq('id', alliance.id);

  return { success: true, newLevel: alliance.level + 1 };
}

async function startAllianceWar(attackerAllianceId, defenderAllianceId) {
  const db = getSupabase();
  
  const { data: attacker } = await db.from('alliances').select('*').eq('id', attackerAllianceId).single();
  const { data: defender } = await db.from('alliances').select('*').eq('id', defenderAllianceId).single();

  const attackerPower = attacker.level * 100 + Math.floor(Math.random() * 50);
  const defenderPower = defender.level * 100 + Math.floor(Math.random() * 50);
  const attackerWins = attackerPower >= defenderPower;

  const goldStolen = attackerWins ? Math.min(Math.floor(defender.treasury_gold * 0.1), 500) : 0;

  if (attackerWins && goldStolen > 0) {
    await db.from('alliances').update({ treasury_gold: defender.treasury_gold - goldStolen }).eq('id', defenderAllianceId);
    await db.from('alliances').update({ treasury_gold: attacker.treasury_gold + goldStolen }).eq('id', attackerAllianceId);
  }

  await db.from('alliance_wars').insert({
    attacker_alliance_id: attackerAllianceId,
    defender_alliance_id: defenderAllianceId,
    winner_alliance_id: attackerWins ? attackerAllianceId : defenderAllianceId,
    gold_stolen: goldStolen
  });

  return { success: true, attackerWins, attackerPower, defenderPower, goldStolen };
}

async function getAllianceWars(allianceId) {
  const db = getSupabase();
  const { data } = await db.from('alliance_wars')
    .select('*')
    .or(`attacker_alliance_id.eq.${allianceId},defender_alliance_id.eq.${allianceId}`)
    .order('created_at', { ascending: false })
    .limit(10);
  return data || [];
}

module.exports = { createAlliance, getPlayerAlliance, getAllAlliances, getAllianceMembers, requestJoin, leaveAlliance, depositToTreasury, upgradeAlliance, startAllianceWar, getAllianceWars, MAX_MEMBERS_PER_LEVEL };