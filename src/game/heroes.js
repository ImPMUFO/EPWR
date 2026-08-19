const { getSupabase } = require('../core/supabase');

async function getPlayerHeroes(telegramId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('player_characters')
    .select(`
      id, level, current_health, xp, is_equipped,
      template:character_templates (
        id, name, type, base_health, base_attack, base_defense, rarity, image_url, description
      )
    `)
    .eq('telegram_id', telegramId)
    .order('acquired_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function getHeroById(heroId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('player_characters')
    .select(`
      id, level, current_health, xp, is_equipped,
      template:character_templates (
        id, name, type, base_health, base_attack, base_defense, rarity, image_url, description
      )
    `)
    .eq('id', heroId)
    .single();

  if (error) return null;
  return data;
}

async function equipHero(telegramId, heroId) {
  const db = getSupabase();
  // اول همه رو غیرفعال کن
  await db.from('player_characters')
    .update({ is_equipped: false })
    .eq('telegram_id', telegramId);
  // بعد اینو فعال کن
  await db.from('player_characters')
    .update({ is_equipped: true })
    .eq('id', heroId);
}

async function unequipHero(heroId) {
  const db = getSupabase();
  await db.from('player_characters')
    .update({ is_equipped: false })
    .eq('id', heroId);
}

module.exports = { getPlayerHeroes, getHeroById, equipHero, unequipHero };