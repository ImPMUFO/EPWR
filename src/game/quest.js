const { getSupabase } = require('../core/supabase');

async function assignDailyQuests(telegramId) {
  const db = getSupabase();
  const { data: existing } = await db.from('player_quests').select('id').eq('telegram_id', telegramId).limit(1).maybeSingle();
  if (existing) return;
  const { data: quests } = await db.from('daily_quests').select('*');
  const shuffled = quests.sort(() => 0.5 - Math.random()).slice(0, 3);
  for (const quest of shuffled) {
    await db.from('player_quests').insert({ telegram_id: telegramId, quest_id: quest.id });
  }
}

async function getPlayerQuests(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('player_quests')
    .select('id, progress, is_completed, is_claimed, quest:daily_quests (type, target_count, gold_reward, gems_reward, description)')
    .eq('telegram_id', telegramId);
  return data || [];
}

async function claimQuestReward(telegramId, questId) {
  const db = getSupabase();
  const { data: pq } = await db.from('player_quests')
    .select('is_completed, is_claimed, quest:daily_quests (gold_reward, gems_reward)')
    .eq('id', questId).single();
  if (!pq) return { success: false, message: '❌ مأموریت پیدا نشد!' };
  if (!pq.is_completed) return { success: false, message: '❌ مأموریت هنوز تمام نشده!' };
  if (pq.is_claimed) return { success: false, message: '❌ قبلاً پاداش را گرفته‌اید!' };
  const { data: player } = await db.from('players').select('*').eq('telegram_id', telegramId).single();
  await db.from('players').update({
    gold: player.gold + pq.quest.gold_reward,
    gems: player.gems + pq.quest.gems_reward
  }).eq('telegram_id', telegramId);
  await db.from('player_quests').update({ is_claimed: true }).eq('id', questId);
  return { success: true, gold: pq.quest.gold_reward, gems: pq.quest.gems_reward };
}

module.exports = { assignDailyQuests, getPlayerQuests, claimQuestReward };