const { getSupabase } = require('../core/supabase');

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
    .select('alliance:alliances (id, name, tag, leader_id, treasury_gold, level), role')
    .eq('telegram_id', telegramId).maybeSingle();
  return data;
}

async function getAllAlliances() {
  const db = getSupabase();
  const { data } = await db.from('alliances').select('*').order('level', { ascending: false });
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
  if (member.role === 'leader') return { success: false, message: '❌ رهبر نمی‌تواند اتحاد را ترک کند!' };
  await db.from('alliance_members').delete().eq('telegram_id', telegramId);
  return { success: true };
}

module.exports = { createAlliance, getPlayerAlliance, getAllAlliances, requestJoin, leaveAlliance };