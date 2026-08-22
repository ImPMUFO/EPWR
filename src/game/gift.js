const { getSupabase } = require('../core/supabase');

// ═══ شناسایی مدیر: env → دیتابیس ═══
async function getAdminId() {
  if (process.env.ADMIN_ID) return parseInt(process.env.ADMIN_ID, 10);
  try {
    const db = getSupabase();
    const { data } = await db.from('bot_assets').select('file_id').eq('key', 'admin_id').maybeSingle();
    return data ? parseInt(data.file_id, 10) : 0;
  } catch(e) { return 0; }
}

async function claimAdmin(telegramId) {
  const db = getSupabase();
  await db.from('bot_assets').upsert({ key: 'admin_id', file_id: String(telegramId) });
}

async function isAdmin(telegramId) {
  const adminId = await getAdminId();
  if (!adminId) return false;
  return telegramId === adminId;
}

async function createGiftCode(code, gold, gems, maxUses, expiresAt) {
  const db = getSupabase();
  const { error } = await db.from('gift_codes').insert({
    code: code.toUpperCase(), gold_reward: gold || 0, gems_reward: gems || 0,
    max_uses: maxUses || 0, current_uses: 0, is_active: true, expires_at: expiresAt
  });
  if (error) {
    if (error.code === '23505') return { success: false, message: '❌ این کد قبلاً ساخته شده!' };
    return { success: false, message: '❌ خطا در ساخت کد!' };
  }
  return { success: true };
}

async function getAllGiftCodes() {
  const db = getSupabase();
  const { data } = await db.from('gift_codes').select('*').order('created_at', { ascending: false });
  return data || [];
}

async function toggleGiftCode(id) {
  const db = getSupabase();
  const { data } = await db.from('gift_codes').select('is_active').eq('id', id).single();
  await db.from('gift_codes').update({ is_active: !data.is_active }).eq('id', id);
  return { success: true };
}

async function deleteGiftCode(id) {
  const db = getSupabase();
  await db.from('gift_code_uses').delete().eq('gift_code_id', id);
  await db.from('gift_codes').delete().eq('id', id);
  return { success: true };
}

async function addResources(telegramId, gold, gems) {
  const db = getSupabase();
  const { data: player } = await db.from('players').select('gold, gems').eq('telegram_id', telegramId).single();
  if (!player) return { success: false, message: '❌ کاربر پیدا نشد!' };
  await db.from('players').update({ gold: player.gold + (gold || 0), gems: player.gems + (gems || 0) }).eq('telegram_id', telegramId);
  return { success: true };
}

async function redeemGiftCode(telegramId, codeText) {
  const db = getSupabase();
  const clean = (codeText || '').trim().toUpperCase();
  if (!clean) return { success: false, message: '❌ کدی وارد نکردی!' };
  const { data: code } = await db.from('gift_codes').select('*').eq('code', clean).maybeSingle();
  if (!code) return { success: false, message: '❌ کد نامعتبره!' };
  if (!code.is_active) return { success: false, message: '❌ کد غیرفعاله!' };
  if (code.expires_at && new Date(code.expires_at) < new Date()) return { success: false, message: '❌ کد منقضی شده!' };
  const { error: useErr } = await db.from('gift_code_uses').insert({ gift_code_id: code.id, telegram_id: telegramId });
  if (useErr) return { success: false, message: '❌ قبلاً این کد رو گرفتی!' };
  if ((code.max_uses || 0) > 0) {
    const { data: up } = await db.from('gift_codes').update({ current_uses: code.current_uses + 1 }).eq('id', code.id).eq('current_uses', code.current_uses).select();
    if (!up || up.length === 0) {
      await db.from('gift_code_uses').delete().eq('gift_code_id', code.id).eq('telegram_id', telegramId);
      return { success: false, message: '❌ ظرفیت کد پر شده!' };
    }
  }
  const { data: player } = await db.from('players').select('gold, gems').eq('telegram_id', telegramId).single();
  await db.from('players').update({ gold: player.gold + (code.gold_reward || 0), gems: player.gems + (code.gems_reward || 0) }).eq('telegram_id', telegramId);
  return { success: true, gold: code.gold_reward || 0, gems: code.gems_reward || 0 };
}

module.exports = { getAdminId, claimAdmin, isAdmin, createGiftCode, getAllGiftCodes, toggleGiftCode, deleteGiftCode, addResources, redeemGiftCode };