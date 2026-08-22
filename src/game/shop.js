const { getSupabase } = require('../core/supabase');
const { updateQuestProgress } = require('./quest');

async function getAllCharacters() {
  const db = getSupabase();
  const { data } = await db.from('character_templates').select('*').or('hidden.eq.false,hidden.is.null').order('price_gold');
  return data || [];
}
async function getAllItems() { const db = getSupabase(); const { data } = await db.from('shop_items').select('*').order('price_gold'); return data || []; }
async function getCharacterById(id) { const db = getSupabase(); const { data } = await db.from('character_templates').select('*').eq('id', id).single(); return data; }
async function getItemById(id) { const db = getSupabase(); const { data } = await db.from('shop_items').select('*').eq('id', id).single(); return data; }

async function purchaseCharacter(telegramId, player, template) {
  const db = getSupabase();
  // ═══ فقط یک بار قابل خرید ═══
  const { data: owned } = await db.from('player_characters').select('id').eq('telegram_id', telegramId).eq('template_id', template.id).maybeSingle();
  if (owned) return { success: false, message: '❌ این قهرمان رو قبلاً خریدی! فقط قابل ارتقا.' };

  if (template.price_gold > 0 && player.gold < template.price_gold) return { success: false, message: `❌ Gold کافی نداری! نیاز: ${template.price_gold}` };
  if (template.price_gems > 0 && player.gems < template.price_gems) return { success: false, message: `❌ Gems کافی نداری! نیاز: ${template.price_gems}` };
  const updates = {};
  if (template.price_gold > 0) updates.gold = player.gold - template.price_gold;
  if (template.price_gems > 0) updates.gems = player.gems - template.price_gems;
  await db.from('players').update(updates).eq('telegram_id', telegramId);
  await db.from('player_characters').insert({ telegram_id: telegramId, template_id: template.id, level: 1, current_health: template.base_health, xp: 0, is_equipped: false });
  await updateQuestProgress(telegramId, 'buy_hero');
  return { success: true };
}

async function purchaseItem(telegramId, player, item) {
  const db = getSupabase();
  if (item.price_gold > 0 && player.gold < item.price_gold) return { success: false, message: `❌ Gold کافی نداری! نیاز: ${item.price_gold}` };
  const updates = { gold: player.gold - item.price_gold };
  if (item.type === 'resource') {
    if (item.name.includes('چوب')) updates.wood = (player.wood || 0) + item.effect_value;
    else if (item.name.includes('سنگ')) updates.stone = (player.stone || 0) + item.effect_value;
    else if (item.name.includes('آهن')) updates.iron = (player.iron || 0) + item.effect_value;
    else if (item.name.includes('غذا')) updates.food = Math.min((player.food || 0) + item.effect_value, player.food_capacity || 1000);
  }
  await db.from('players').update(updates).eq('telegram_id', telegramId);
  if (item.type !== 'resource') await db.from('player_items').insert({ telegram_id: telegramId, item_id: item.id, is_active: item.type === 'generator' });
  return { success: true };
}

async function usePotion(telegramId, heroId) {
  const db = getSupabase();
  const { data: potionItem } = await db.from('player_items').select('id, item:shop_items (id, type, effect_value)').eq('telegram_id', telegramId).eq('is_active', false).limit(1).maybeSingle();
  if (!potionItem || potionItem.item.type !== 'potion') return { success: false, message: '❌ معجون نداری!' };
  const { data: hero } = await db.from('player_characters').select('id, current_health, template:character_templates (base_health, name)').eq('id', heroId).single();
  if (!hero) return { success: false, message: '❌ قهرمان پیدا نشد!' };
  const maxHp = hero.template.base_health;
  if (hero.current_health >= maxHp) return { success: false, message: '❌ سلامتی پر است!' };
  const newHp = Math.min(maxHp, hero.current_health + potionItem.item.effect_value);
  await db.from('player_characters').update({ current_health: newHp }).eq('id', heroId);
  await db.from('player_items').delete().eq('id', potionItem.id);
  return { success: true, heroName: hero.template.name, newHp, maxHp };
}

async function getPlayerItems(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('player_items').select('id, item:shop_items (name, type, effect_value), is_active').eq('telegram_id', telegramId);
  return data || [];
}

module.exports = { getAllCharacters, getAllItems, getCharacterById, getItemById, purchaseCharacter, purchaseItem, usePotion, getPlayerItems };