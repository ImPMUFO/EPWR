const { getSupabase } = require('../core/supabase');

function restMinutes(template, level) {
  const m = Math.floor(((template.base_health||0)+(template.base_attack||0)+(template.base_defense||0))/10) + (level||1)*2;
  return Math.max(5, m);
}

async function sendToRest(db, hero) {
  const mins = restMinutes(hero.template, hero.level);
  const until = new Date(Date.now()+mins*60000).toISOString();
  await db.from('player_characters').update({ current_health: 0, rest_until: until }).eq('id', hero.id);
  return mins;
}

async function getBarracksLevel(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('buildings').select('level').eq('telegram_id', telegramId).eq('type','barracks').maybeSingle();
  return data ? data.level : 0;
}

async function processHeroRest(telegramId) {
  const db = getSupabase();
  const now = new Date();
  const { data: resting } = await db.from('player_characters')
    .select('id, level, rest_until, template:character_templates (required_barracks, base_health)')
    .eq('telegram_id', telegramId).eq('current_health', 0);
  if (!resting || resting.length===0) return;
  const barracks = await getBarracksLevel(telegramId);
  for (const h of resting) {
    if (h.rest_until && new Date(h.rest_until) <= now) {
      const req = h.template?.required_barracks || 1;
      if (barracks >= req) {
        await db.from('player_characters').update({ current_health: (h.template.base_health||100)*h.level, rest_until: null }).eq('id', h.id);
      }
    }
  }
}

module.exports = { restMinutes, sendToRest, getBarracksLevel, processHeroRest };