const { getSupabase } = require('../core/supabase');

const battleSessions = new Map();

function getSession(telegramId) {
  if (!battleSessions.has(telegramId)) {
    battleSessions.set(telegramId, { 
      selectedHeroes: [], 
      target: null, 
      targetType: null,
      ownerId: telegramId 
    });
  }
  return battleSessions.get(telegramId);
}

function hasActiveSession(telegramId) {
  const session = battleSessions.get(telegramId);
  return session && session.target !== null;
}

function clearSession(telegramId) {
  battleSessions.delete(telegramId);
}

async function getPlayerHeroes(telegramId) {
  const db = getSupabase();
  const { data } = await db
    .from('player_characters')
    .select(`id, level, xp, current_health, template:character_templates (id, name, base_attack, base_defense, base_health, rarity, image_url)`)
    .eq('telegram_id', telegramId)
    .gt('current_health', 0);
  return data || [];
}

async function getBotRealms() {
  const db = getSupabase();
  const { data } = await db.from('bot_realms').select('*').order('difficulty');
  return data || [];
}

async function getDefeatedNPCs(telegramId) {
  const db = getSupabase();
  const { data } = await db.from('npc_defeated')
    .select('bot_realm_id')
    .eq('telegram_id', telegramId);
  return (data || []).map(d => d.bot_realm_id);
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
  const deadHeroes = [];

  if (playerWins) {
    const { data: player } = await db.from('players').select('gold').eq('telegram_id', telegramId).single();
    await db.from('players').update({ gold: player.gold + goldReward }).eq('telegram_id', telegramId);
    await db.from('npc_defeated').insert({ telegram_id: telegramId, bot_realm_id: botRealm.id });

    for (const hero of selected) {
      const xpGained = 10 + botRealm.difficulty * 5;
      const newXp = (hero.xp || 0) + xpGained;
      const xpNeeded = hero.level * 100;
      const leveledUp = newXp >= xpNeeded;
      const newLevel = leveledUp ? hero.level + 1 : hero.level;
      const finalXp = leveledUp ? newXp - xpNeeded : newXp;
      const damage = Math.floor(Math.random() * 10) + 5;
      const newHp = Math.max(1, hero.current_health - damage);
      
      await db.from('player_characters').update({ 
        current_health: newHp,
        xp: finalXp,
        level: newLevel
      }).eq('id', hero.id);
    }
  } else {
    for (const hero of selected) {
      const damage = Math.floor(botPower / selected.length) + Math.floor(Math.random() * 15);
      const newHp = hero.current_health - damage;

      if (newHp <= 0) {
        await db.from('player_characters').delete().eq('id', hero.id);
        deadHeroes.push(hero.template.name);
      } else {
        await db.from('player_characters').update({ current_health: newHp }).eq('id', hero.id);
      }
    }
  }

  return {
    success: true, playerWins, playerPower, botPower,
    goldReward: playerWins ? goldReward : 0,
    botRealm, selectedHeroes: selected, deadHeroes
  };
}

module.exports = { getSession, hasActiveSession, clearSession, getPlayerHeroes, getBotRealms, getDefeatedNPCs, calcTeamPower, fightNPC };