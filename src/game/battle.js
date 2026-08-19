const { getSupabase } = require('../core/supabase');

// State موقت برای انتخاب قهرمان در جنگ
const battleSessions = new Map();

function getSession(telegramId) {
  if (!battleSessions.has(telegramId)) {
    battleSessions.set(telegramId, { selectedHeroes: [], target: null, targetType: null });
  }
  return battleSessions.get(telegramId);
}

function clearSession(telegramId) {
  battleSessions.delete(telegramId);
}

async function getPlayerHeroes(telegramId) {
  const db = getSupabase();
  const { data } = await db
    .from('player_characters')
    .select(`id, level, current_health, template:character_templates (id, name, base_attack, base_defense, base_health, rarity, image_url)`)
    .eq('telegram_id', telegramId);
  return data || [];
}

async function getBotRealms() {
  const db = getSupabase();
  const { data } = await db.from('bot_realms').select('*').order('difficulty');
  return data || [];
}

function calcTeamPower(heroes) {
  return heroes.reduce((sum, h) => {
    const t = h.template;
    return sum + t.base_attack + t.base_defense + h.level * 5;
  }, 0);
}

async function fightNPC(telegramId, botRealm, selectedHeroIds) {
  const db = getSupabase();
  const heroes = await getPlayerHeroes(telegramId);
  const selected = heroes.filter(h => selectedHeroIds.includes(h.id));

  if (selected.length === 0) return { success: false, message: '❌ قهرمانی انتخاب نکردی!' };

  const playerPower = calcTeamPower(selected) + Math.floor(Math.random() * 15);
  const botPower = botRealm.bot_power + Math.floor(Math.random() * 10);
  const playerWins = playerPower >= botPower;

  const goldReward = botRealm.gold_reward_min + Math.floor(Math.random() * (botRealm.gold_reward_max - botRealm.gold_reward_min));

  if (playerWins) {
    const { data: player } = await db.from('players').select('gold').eq('telegram_id', telegramId).single();
    await db.from('players').update({ gold: player.gold + goldReward }).eq('telegram_id', telegramId);
  }

  await db.from('battles').insert({
    attacker_id: telegramId,
    defender_id: telegramId,
    winner_id: playerWins ? telegramId : -1,
    gold_stolen: playerWins ? goldReward : 0,
    attacker_power: playerPower,
    defender_power: botPower
  });

  return {
    success: true, playerWins, playerPower, botPower,
    goldReward: playerWins ? goldReward : 0,
    botRealm, selectedHeroes: selected
  };
}

module.exports = { getSession, clearSession, getPlayerHeroes, getBotRealms, calcTeamPower, fightNPC };