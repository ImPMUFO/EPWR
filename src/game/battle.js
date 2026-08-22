const { getSupabase } = require('../core/supabase');
const { addPlayerXp, xpForActivity } = require('./xp');
const { updateQuestProgress } = require('./quest');
const { getListedHeroIds } = require('./market');
const { heroTroopsPower } = require('./troops');
const { skinBonus, weaponPower } = require('./cosmetics');
const { sendToRest } = require('./rest');

const battleSessions = new Map();
function getSession(t){ if(!battleSessions.has(t))battleSessions.set(t,{selectedHeroes:[],target:null,targetType:null}); return battleSessions.get(t);}
function clearSession(t){ battleSessions.delete(t);}

const HERO_SELECT = 'id, level, xp, current_health, troops_data, troop_level, is_defender, skin, weapon, template:character_templates (id, name, base_attack, base_defense, base_health, rarity, troop_type, troop_power, troops_per_level, required_barracks)';

async function getPlayerHeroes(t){const db=getSupabase();const{data}=await db.from('player_characters').select(HERO_SELECT).eq('telegram_id',t).gt('current_health',0);return data||[];}
async function getAttackHeroes(t){const db=getSupabase();const listed=await getListedHeroIds(t);const{data}=await db.from('player_characters').select(HERO_SELECT).eq('telegram_id',t).gt('current_health',0).eq('is_defender',false);return (data||[]).filter(h=>!listed.includes(h.id));}
async function getDefenderHeroes(t){const db=getSupabase();const{data}=await db.from('player_characters').select(HERO_SELECT).eq('telegram_id',t).gt('current_health',0).eq('is_defender',true);return data||[];}
async function getBotRealms(){const db=getSupabase();const{data}=await db.from('bot_realms').select('*').order('difficulty');return data||[];}
async function getDefeatedNPCs(t){const db=getSupabase();const{data}=await db.from('npc_defeated').select('bot_realm_id').eq('telegram_id',t);return (data||[]).map(d=>d.bot_realm_id);}

// ═══ قدرت = پایه + سطح + سربازها + اسکین + سلاح ═══
function calcTeamPower(heroes){
  return heroes.reduce((s,h)=>{
    const t=h.template; const sb=skinBonus(h.skin);
    return s + t.base_attack + (sb.attack||0) + t.base_defense + (sb.defense||0) + h.level*5 + heroTroopsPower(h) + weaponPower(h.weapon);
  },0);
}

async function fightNPC(telegramId, botRealm, selectedHeroIds) {
  const db = getSupabase();
  const heroes = await getAttackHeroes(telegramId);
  const selected = heroes.filter(h=>selectedHeroIds.includes(h.id));
  if (selected.length===0) return { success:false, message:'❌ قهرمانی انتخاب نکردی!' };
  const playerPower = calcTeamPower(selected)+Math.floor(Math.random()*15);
  const botPower = botRealm.bot_power+Math.floor(Math.random()*10);
  const playerWins = playerPower>=botPower;
  const goldReward = botRealm.gold_reward_min+Math.floor(Math.random()*(botRealm.gold_reward_max-botRealm.gold_reward_min));
  const restHeroes = [];
  if (playerWins) {
    const {data:player}=await db.from('players').select('gold').eq('telegram_id',telegramId).single();
    await db.from('players').update({gold:player.gold+goldReward}).eq('telegram_id',telegramId);
    await db.from('npc_defeated').insert({telegram_id:telegramId,bot_realm_id:botRealm.id});
    for (const hero of selected) {
      const xpG=10+botRealm.difficulty*5; const newXp=(hero.xp||0)+xpG; const need=hero.level*100;
      const up=newXp>=need; const nl=up?hero.level+1:hero.level; const fx=up?newXp-need:newXp;
      const dmg=Math.floor(Math.random()*10)+5; const nhp=Math.max(1,hero.current_health-dmg);
      await db.from('player_characters').update({current_health:nhp,xp:fx,level:nl}).eq('id',hero.id);
    }
    await addPlayerXp(telegramId,xpForActivity('battle_win'));
    await updateQuestProgress(telegramId,'battle_win');
  } else {
    for (const hero of selected) {
      const dmg=Math.floor(botPower/selected.length)+Math.floor(Math.random()*15);
      const nhp=hero.current_health-dmg;
      if (nhp<=0){ await sendToRest(db,hero); restHeroes.push(hero.template.name); }
      else await db.from('player_characters').update({current_health:nhp,troops_data:{}}).eq('id',hero.id);
    }
    await addPlayerXp(telegramId,xpForActivity('battle_lose'));
  }
  return { success:true, playerWins, playerPower, botPower, goldReward:playerWins?goldReward:0, botRealm, selectedHeroes:selected, restHeroes };
}

module.exports = { getSession, clearSession, getPlayerHeroes, getAttackHeroes, getDefenderHeroes, getBotRealms, getDefeatedNPCs, calcTeamPower, fightNPC };