const { getSupabase } = require('../core/supabase');

async function getAllCharacters() {
  const db = getSupabase();
  const { data, error } = await db
    .from('character_templates')
    .select('*')
    .order('price_gold', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getCharacterById(id) {
  const db = getSupabase();
  const { data, error } = await db
    .from('character_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

async function purchaseCharacter(telegramId, player, template) {
  const db = getSupabase();

  // بررسی موجودی
  if (template.price_gold > 0 && player.gold < template.price_gold) {
    return { success: false, message: `❌ Gold کافی نداری! نیاز: ${template.price_gold}` };
  }
  if (template.price_gems > 0 && player.gems < template.price_gems) {
    return { success: false, message: `❌ Gems کافی نداری! نیاز: ${template.price_gems}` };
  }

  // کم کردن پول
  const updates = {};
  if (template.price_gold > 0) updates.gold = player.gold - template.price_gold;
  if (template.price_gems > 0) updates.gems = player.gems - template.price_gems;

  await db.from('players').update(updates).eq('telegram_id', telegramId);

  // اضافه کردن شخصیت
  const { error } = await db.from('player_characters').insert({
    telegram_id: telegramId,
    template_id: template.id,
    level: 1,
    current_health: template.base_health,
    xp: 0,
    is_equipped: false
  });

  if (error) return { success: false, message: '❌ خطا در خرید!' };

  return { success: true, character: template };
}

module.exports = { getAllCharacters, getCharacterById, purchaseCharacter };