const { getSupabase } = require('../core/supabase');

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function addNotification(telegramId, type, message, attackerName = null, goldAmount = 0) {
  const db = getSupabase();
  await db.from('notifications').insert({
    telegram_id: telegramId,
    type,
    message,
    attacker_name: attackerName,
    gold_amount: goldAmount
  });
}

async function getNotifications(telegramId) {
  const db = getSupabase();
  const weekAgo = new Date(Date.now() - ONE_WEEK_MS).toISOString();
  
  // پاک کردن اعلان‌های قدیمی‌تر از یک هفته
  await db.from('notifications')
    .delete()
    .eq('telegram_id', telegramId)
    .lt('created_at', weekAgo);

  // دریافت اعلان‌های هفته اخیر
  const { data } = await db
    .from('notifications')
    .select('*')
    .eq('telegram_id', telegramId)
    .gte('created_at', weekAgo)
    .order('created_at', { ascending: false })
    .limit(20);

  return data || [];
}

async function getUnreadCount(telegramId) {
  const db = getSupabase();
  const weekAgo = new Date(Date.now() - ONE_WEEK_MS).toISOString();
  
  const { count } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('telegram_id', telegramId)
    .eq('is_read', false)
    .gte('created_at', weekAgo);

  return count || 0;
}

async function markAllAsRead(telegramId) {
  const db = getSupabase();
  await db.from('notifications')
    .update({ is_read: true })
    .eq('telegram_id', telegramId)
    .eq('is_read', false);
}

module.exports = { addNotification, getNotifications, getUnreadCount, markAllAsRead };