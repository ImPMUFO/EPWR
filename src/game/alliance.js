const { getSupabase } = require('../core/supabase');

const MAX_MEMBERS_PER_LEVEL = { 1: 10, 2: 15, 3: 20, 4: 25, 5: 30 };
const WAR_POWER_PER_LEVEL = { 1: 100, 2: 150, 3: 220, 4: 300, 5: 400 };
const DAILY_REWARD_PER_LEVEL = { 1: 0, 2: 20, 3: 40, 4: 60, 5: 100 };

async function createAlliance(telegramId, name, tag, description, linkedGroupId = null, linkedGroupName = null) {
  const db = getSupabase();
  const inviteCode = Math.random().toString(36).substring(2, 10);
  const { data: alliance, error } = await db.from('alliances').insert({
    name, tag: tag.toUpperCase(), description, leader_id: telegramId,
    linked_group_id: linkedGroupId, linked_group_name: linkedGroupName,
    invite_code: inviteCode
  }).select().single();
  if (error) return { success: false, message: '❌ خطا در ساخت اتحاد!' };
  await db.from('alliance_members').insert({ alliance_id: alliance.id, telegram_id: telegramId, role: 'leader' });
  return { success: true, alliance };
}

// ═══ نقش رهبر همیشه درست تشخیص داده میشه ═══
async function getPlayerAlliance(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('alliance_members')
    .select('alliance:alliances (*), role, last_daily_claim')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (data && data.alliance && data.alliance.leader_id === telegramId) {
    data.role = 'leader';
  }
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

async function joinAlliance(telegramId, allianceId) {
  const db = getSupabase();
  const { data: alliance } = await db.from('alliances').select('*').eq('id', allianceId).single();
  if (!alliance) return { success: false, message: '❌ اتحاد پیدا نشد!' };

  const { data: existing } = await db.from('alliance_members').select('alliance_id').eq('telegram_id', telegramId).maybeSingle();
  if (existing) return { success: false, message: '❌ قبلاً عضو اتحاد هستید!' };

  const members = await getAllianceMembers(allianceId);
  const maxMembers = MAX_MEMBERS_PER_LEVEL[alliance.level || 1] || 10;
  if (members.length >= maxMembers) return { success: false, message: '❌ اتحاد پر است!' };

  const role = alliance.leader_id === telegramId ? 'leader' : 'member';
  await db.from('alliance_members').insert({ alliance_id: allianceId, telegram_id: telegramId, role });
  return { success: true, alliance, role };
}

async function joinAllianceByInvite(telegramId, inviteCode) {
  const alliance = await getAllianceByInviteCode(inviteCode);
  if (!alliance) return { success: false, message: '❌ کد دعوت نامعتبره!' };
  return joinAlliance(telegramId, alliance.id);
}

async function getAllAlliances() {
  const db = getSupabase();
  const { data } = await db.from('alliances').select('*');
  return data || [];
}

async function getTopAlliances(limit = 10) {
  const db = getSupabase();
  const { data } = await db.from('alliances').select('*').limit(limit);
  return data || [];
}

async function getAllianceMembers(allianceId) {
  const db = getSupabase();
  const { data } = await db.from('alliance_members')
    .select('telegram_id, role, players (commander_name, level)')
    .eq('alliance_id', allianceId);
  return data || [];
}

async function updateAllianceInfo(telegramId, updates) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };
  if (member.role !== 'leader') return { success: false, message: '❌ فقط رهبر می‌تواند ویرایش کند!' };
  if (updates.tag) updates.tag = updates.tag.toUpperCase();
  const { error } = await db.from('alliances').update(updates).eq('id', member.alliance.id);
  if (error) return { success: false, message: '❌ این تگ قبلاً استفاده شده!' };
  return { success: true };
}

async function leaveAlliance(telegramId) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };
  await db.from('alliance_members').delete().eq('telegram_id', telegramId);
  return { success: true };
}

async function deleteAlliance(telegramId) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };
  if (member.role !== 'leader') return { success: false, message: '❌ فقط رهبر!' };
  const allianceId = member.alliance.id;
  await db.from('alliance_members').delete().eq('alliance_id', allianceId);
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
  return { success: true };
}

// ═══ جایزه روزانه از خزانه ═══
async function claimDailyReward(telegramId) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };

  const lastClaim = member.last_daily_claim ? new Date(member.last_daily_claim) : null;
  const now = new Date();
  if (lastClaim) {
    const hoursPassed = (now - lastClaim) / (1000 * 60 * 60);
    if (hoursPassed < 24) {
      const remaining = Math.ceil(24 - hoursPassed);
      return { success: false, message: `❌ جایزه امروز رو گرفتی! (${remaining} ساعت دیگه)` };
    }
  }

  const alliance = member.alliance;
  const reward = DAILY_REWARD_PER_LEVEL[alliance.level || 1] || 0;
  if (reward <= 0) return { success: false, message: '❌ اتحاد باید سطح ۲ باشه برای جایزه!' };
  if ((alliance.treasury_gold || 0) < reward) return { success: false, message: '❌ خزانه خالیه! واریز کنید.' };

  const { data: player } = await db.from('players').select('gold').eq('telegram_id', telegramId).single();
  await db.from('players').update({ gold: player.gold + reward }).eq('telegram_id', telegramId);
  await db.from('alliances').update({ treasury_gold: alliance.treasury_gold - reward }).eq('id', alliance.id);
  await db.from('alliance_members').update({ last_daily_claim: now.toISOString() }).eq('alliance_id', alliance.id).eq('telegram_id', telegramId);

  return { success: true, reward };
}

async function upgradeAlliance(telegramId) {
  const db = getSupabase();
  const member = await getPlayerAlliance(telegramId);
  if (!member) return { success: false, message: '❌ عضو اتحاد نیستید!' };
  if (member.role !== 'leader') return { success: false, message: '❌ فقط رهبر!' };
  const alliance = member.alliance;
  const currentLevel = alliance.level || 1;
  if (currentLevel >= 5) return { success: false, message: '❌ حداکثر سطح!' };
  const upgradeCost = currentLevel * 500;
  if ((alliance.treasury_gold || 0) < upgradeCost) return { success: false, message: `❌ خزانه کافی نیست! نیاز: ${upgradeCost}` };
  await db.from('alliances').update({ level: currentLevel + 1, treasury_gold: alliance.treasury_gold - upgradeCost }).eq('id', alliance.id);
  return { success: true, newLevel: currentLevel + 1 };
}

// ═══ جنگ با بونوس خزانه ═══
async function startAllianceWar(attackerAllianceId, defenderAllianceId) {
  const db = getSupabase();
  const { data: attacker } = await db.from('alliances').select('*').eq('id', attackerAllianceId).single();
  const { data: defender } = await db.from('alliances').select('*').eq('id', defenderAllianceId).single();
  const attackerPower = (WAR_POWER_PER_LEVEL[attacker.level || 1] || 100) + Math.floor((attacker.treasury_gold || 0) / 100) + Math.floor(Math.random() * 50);
  const defenderPower = (WAR_POWER_PER_LEVEL[defender.level || 1] || 100) + Math.floor((defender.treasury_gold || 0) / 100) + Math.floor(Math.random() * 50);
  const attackerWins = attackerPower >= defenderPower;
  const goldStolen = attackerWins ? Math.min(Math.floor((defender.treasury_gold || 0) * 0.1), 500) : 0;
  if (attackerWins && goldStolen > 0) {
    await db.from('alliances').update({ treasury_gold: (defender.treasury_gold || 0) - goldStolen }).eq('id', defenderAllianceId);
    await db.from('alliances').update({ treasury_gold: (attacker.treasury_gold || 0) + goldStolen }).eq('id', attackerAllianceId);
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
  joinAlliance, joinAllianceByInvite, getAllAlliances, getTopAlliances, getAllianceMembers,
  updateAllianceInfo, leaveAlliance, deleteAlliance, depositToTreasury, claimDailyReward,
  upgradeAlliance, startAllianceWar, getAllianceWars, MAX_MEMBERS_PER_LEVEL,
  WAR_POWER_PER_LEVEL, DAILY_REWARD_PER_LEVEL
};