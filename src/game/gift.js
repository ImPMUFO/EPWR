const { getSupabase } = require('../core/supabase');

const ADMIN_ID = 7410098102;

async function createGiftCode(code, gold, gems, maxUses, expiresAt) {
  const db = getSupabase();
  const { error } = await db.from('gift_codes').insert({
    code: code.toUpperCase(), gold_reward: gold, gems_reward: gems,
    max_uses: maxUses || null, expires_at: expiresAt || null, created_by: ADMIN_ID
  });
  if (error) {
    if (error.code === '23505') return { success: false, message: '❌ این کد قبلاً وجود دارد!' };
    return { success: false, message: '❌ خطا در ساخت کد!' };
  }
  return { success: true };
}

async function redeemGiftCode(telegramId, code) {
  const db = getSupabase();
  code = code.toUpperCase().trim();
  const { data: gift } = await db.from('gift_codes').select('*').eq('code', code).single();
  if (!gift) return { success: false, message: '❌ کد هدیه پیدا نشد!' };
  if (!gift.is_active) return { success: false, message: '❌ این کد غیرفعال شده!' };
  if (gift.expires_at && new Date(gift.expires_at) < new Date()) {
    return { success: false, message: '❌ این کد منقضی شده!' };
  }
  if (gift.max_uses && gift.current_uses >= gift.max_uses) {
    return { success: false, message: '❌ این کد به حداکثر استفاده رسیده!' };
  }
  const { data: alreadyUsed } = await db.from('gift_code_uses')
    .select('id').eq('code_id', gift.id).eq('telegram_id', telegramId).maybeSingle();
  if (alreadyUsed) return { success: false, message: '❌ شما قبلاً از این کد استفاده کرده‌اید!' };
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if (!player) return { success: false, message: '❌ شما هنوز بازیکن نیستید!' };
  await db.from('players').update({
    gold: player.gold + gift.gold_reward,
    gems: player.gems + gift.gems_reward
  }).eq('telegram_id', telegramId);
  await db.from('gift_code_uses').insert({ code_id: gift.id, telegram_id: telegramId });
  await db.from('gift_codes').update({ current_uses: gift.current_uses + 1 }).eq('id', gift.id);
  return { success: true, gold: gift.gold_reward, gems: gift.gems_reward };
}

async function getAllGiftCodes() {
  const db = getSupabase();
  const { data } = await db.from('gift_codes').select('*').order('created_at', { ascending: false });
  return data || [];
}

async function toggleGiftCode(codeId) {
  const db = getSupabase();
  const { data: gift } = await db.from('gift_codes').select('*').eq('id', codeId).single();
  if (!gift) return { success: false };
  await db.from('gift_codes').update({ is_active: !gift.is_active }).eq('id', codeId);
  return { success: true, newState: !gift.is_active };
}

async function deleteGiftCode(codeId) {
  const db = getSupabase();
  await db.from('gift_codes').delete().eq('id', codeId);
  return { success: true };
}

async function addResources(telegramId, gold, gems) {
  const db = getSupabase();
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if (!player) return { success: false, message: '❌ بازیکن پیدا نشد!' };
  await db.from('players').update({
    gold: player.gold + (gold || 0),
    gems: player.gems + (gems || 0)
  }).eq('telegram_id', telegramId);
  return { success: true };
}

module.exports = { ADMIN_ID, createGiftCode, redeemGiftCode, getAllGiftCodes, toggleGiftCode, deleteGiftCode, addResources };