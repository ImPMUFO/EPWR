const { getSupabase } = require('../core/supabase');

async function getAllCharacters() {
  const db = getSupabase();
  const { data } = await db.from('character_templates').select('*').order('price_gold');
  return data || [];
}

async function getAllItems() {
  const db = getSupabase();
  const { data } = await db.from('shop_items').select('*').order('price_gold');
  return data || [];
}

async function getCharacterById(id) {
  const db = getSupabase();
  const { data } = await db.from('character_templates').select('*').eq('id', id).single();
  return data;
}

async function getItemById(id) {
  const db = getSupabase();
  const { data } = await db.from('shop_items').select('*').eq('id', id).single();
  return data;
}

async function purchaseCharacter(telegramId, player, template) {
  const db = getSupabase();
  if (template.price_gold > 0 && player.gold < template.price_gold) {
    return { success: false, message: `❌ Gold کافی نداری! نیاز: ${template.price_gold}` };
  }
  if (template.price_gems > 0 && player.gems < template.price_gems) {
    return { success: false, message: `❌ Gems کافی نداری! نیاز: ${template.price_gems}` };
  }

  const updates = {};
  if (template.price_gold > 0) updates.gold = player.gold - template.price_gold;
  if (template.price_gems > 0) updates.gems = player.gems - template.price_gems;
  await db.from('players').update(updates).eq('telegram_id', telegramId);

  await db.from('player_characters').insert({
    telegram_id: telegramId, template_id: template.id,
    level: 1, current_health: template.base_health, xp: 0, is_equipped: false
  });

  return { success: true };
}

async function purchaseItem(telegramId, player, item) {
  const db = getSupabase();
  if (item.price_gold > 0 && player.gold < item.price_gold) {
    return { success: false, message: `❌ Gold کافی نداری! نیاز: ${item.price_gold}` };
  }

  await db.from('players').update({ gold: player.gold - item.price_gold }).eq('telegram_id', telegramId);
  await db.from('player_items').insert({
    telegram_id: telegramId, item_id: item.id, is_active: item.type === 'generator'
  });

  return { success: true };
}

module.exports = { getAllCharacters, getAllItems, getCharacterById, getItemById, purchaseCharacter, purchaseItem };