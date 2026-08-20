const { getSupabase } = require('../core/supabase');

const MAX_MEMBERS_PER_LEVEL = { 1: 10, 2: 15, 3: 20, 4: 25, 5: 30 };
const WAR_POWER_PER_LEVEL = { 1: 100, 2: 150, 3: 220, 4: 300, 5: 400 };
const DAILY_REWARD_PER_LEVEL = { 1: 0, 2: 20, 3: 40, 4: 60, 5: 100 };

async function createAlliance(telegramId, name, tag, description, linkedGroupId = null, linkedGroupName = null) {
  const db = getSupabase();
  const { data: existing } = await db.from('alliance_members').select('alliance_id').eq('telegram_id', telegramId).maybeSingle();
  if (existing && !linkedGroupId) return { success: false, message: '❌ قبلاً عضو اتحاد هستید!' };
  
  const inviteCode = Math.random().toString(36).substring(2, 10);
  
  const { error } = await db.from('alliances').insert({
    name, tag: tag.toUpperCase(), description, leader_id: telegramId,
    linked_group_id: linkedGroupId, linked_group_name: linkedGroupName,
    invite_code: inviteCode
  });
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
    .select('alliance:alliances (id, name, tag, leader_id, treasury_gold, level, xp, xp_to_next, linked_group_id, linked_group_name, invite_code), role')
    .eq('telegram_id', telegramId).maybeSingle();
  return data;
}

async function getAllianceByGroupId(groupId) {
  const db = getSupabase();
  const { data } = await db.from('alliances').select('*').eq('linked_group_id', groupId).maybeSingle();
  return data;
}

async function getAllianceByInviteCode(inviteCode) {
  const db = getSupabase();
  const { data } = await db.from('alliances').select('*').eq('invite_code', inviteCode).maybeSingle();
  return data;
}

async function joinAllianceByInvite(telegramId, inviteCode) {
  const db = getSupabase();
  const alliance = await getAllianceByInviteCode(inviteCode);
  if (!alliance) return { success: false, message: '❌ کد دعوت نامعتبره!' };
  
  const { data: existing } = await db.from('alliance_members').select('alliance_id').eq('telegram_id', telegramId).maybeSingle();
  if (existing) return { success: false, message: '❌ قبلاً عضو اتحاد هستید!' };
  
  await db.from('alliance_members').insert({ alliance_id: alliance.id, telegram_id: telegramId, role: 'member' });
  return { success: true, alliance };
}

async function getAllAlliances() {
  const db = getSupabase();
  const { data } = await db.from('alliances').select('*').order('level', { ascending: false });
  return data || [];
}

async function getTopAlliances(limit = 10) {
  const db = getSupabase();
  const { data } = await db.from('alliances')
    .select('*')
    .order('level', { ascending: false })
    .order('treasury_gold', { ascending: false })
    .limit(limit);
  return data || [];
}

async function getAllianceMembers(allianceId) {
  const db = getSupabase();
  const { data } = await db.from('alliance_members')
    .select('telegram_id, role, players (commander_name, level)')
    .eq('alliance_id', allianceId);
  return data || [];
}

async function renameAlliance(telegramId, newName) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };
  if (member.role !== 'leader') return { success: false, message: '❌ فقط رهبر می‌تواند تغییر نام دهد!' };
  await db.from('alliances').update({ name: newName }).eq('id', member.alliance.id);
  return { success: true };
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
  
  // همه می‌تونن ترک کنن، حتی مدیر تنها
  await db.from('alliance_members').delete().eq('telegram_id', telegramId);
  return { success: true };
}

async function deleteAlliance(telegramId) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };
  if (member.role !== 'leader') return { success: false, message: '❌ فقط رهبر می‌تواند اتحاد را حذف کند!' };
  
  const allianceId = member.alliance.id;
  
  // حذف اعضا
  await db.from('alliance_members').delete().eq('alliance_id', allianceId);
  
  // حذف درخواست‌های عضویت
  await db.from('alliance_join_requests').delete().eq('alliance_id', allianceId);
  
  // حذف جنگ‌ها
  await db.from('alliance_wars').delete().or(`attacker_alliance_id.eq.${allianceId},defender_alliance_id.eq.${allianceId}`);
  
  // حذف اتحاد
  await db.from('alliances').delete().eq('id', allianceId);
  
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
  
  const attackerPower = (WAR_POWER_PER_LEVEL[attacker.level] || 100) + Math.floor(Math.random() * 50);
  const defenderPower = (WAR_POWER_PER_LEVEL[defender.level] || 100) + Math.floor(Math.random() * 50);
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

module.exports = {
  createAlliance, getPlayerAlliance, getAllianceByGroupId, getAllianceByInviteCode,
  joinAllianceByInvite, getAllAlliances, getTopAlliances, getAllianceMembers,
  renameAlliance, requestJoin, leaveAlliance, deleteAlliance, depositToTreasury,
  upgradeAlliance, startAllianceWar, getAllianceWars, MAX_MEMBERS_PER_LEVEL,
  WAR_POWER_PER_LEVEL, DAILY_REWARD_PER_LEVEL
};