const { getSupabase } = require('../core/supabase');

async function assignDailyQuests(telegramId) {
  const db = getSupabase();
  
  // چک کن آیا مأموریت‌های امروز رو داره یا نه
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await db.from('player_quests')
    .select('id, quest_id')
    .eq('telegram_id', telegramId)
    .gte('assigned_at', `${today}T00:00:00Z`)
    .limit(1)
    .maybeSingle();
  
  if (existing) return;

  // پاک کردن مأموریت‌های قدیمی
  await db.from('player_quests').delete().eq('telegram_id', telegramId);

  const { data: quests } = await db.from('daily_quests').select('*');
  const shuffled = quests.sort(() => 0.5 - Math.random()).slice(0, 3);

  for (const quest of shuffled) {
    await db.from('player_quests').insert({
      telegram_id: telegramId,
      quest_id: quest.id,
      progress: 0,
      is_completed: false,
      is_claimed: false
    });
  }
}

async function getPlayerQuests(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('player_quests')
    .select('id, progress, is_completed, is_claimed, quest:daily_quests (id, type, target_count, gold_reward, gems_reward, description)')
    .eq('telegram_id', telegramId);
  return data || [];
}

async function updateQuestProgress(telegramId, type, amount = 1) {
  const db = getSupabase();
  const quests = await getPlayerQuests(telegramId);
  
  for (const q of quests) {
    if (q.quest && q.quest.type === type && !q.is_completed) {
      const newProgress = q.progress + amount;
      const isCompleted = newProgress >= q.quest.target_count;
      await db.from('player_quests').update({
        progress: newProgress,
        is_completed: isCompleted
      }).eq('id', q.id);
    }
  }
}

async function claimQuestReward(telegramId, questId) {
  const db = getSupabase();
  const { data: pq } = await db.from('player_quests')
    .select('is_completed, is_claimed, quest:daily_quests (gold_reward, gems_reward)')
    .eq('id', questId)
    .single();

  if (!pq) return { success: false, message: '❌ مأموریت پیدا نشد!' };
  if (!pq.is_completed) return { success: false, message: '❌ مأموریت هنوز تمام نشده!' };
  if (pq.is_claimed) return { success: false, message: '❌ قبلاً پاداش را گرفته‌اید!' };

  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  if (!player) return { success: false, message: '❌ بازیکن پیدا نشد!' };
  
  await db.from('players').update({
    gold: player.gold + (pq.quest.gold_reward || 0),
    gems: player.gems + (pq.quest.gems_reward || 0)
  }).eq('telegram_id', telegramId);

  await db.from('player_quests').update({ is_claimed: true }).eq('id', questId);

  return { success: true, gold: pq.quest.gold_reward || 0, gems: pq.quest.gems_reward || 0 };
}

module.exports = { assignDailyQuests, getPlayerQuests, updateQuestProgress, claimQuestReward };