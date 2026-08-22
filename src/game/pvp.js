const { getSupabase } = require('../core/supabase');
const { getAttackHeroes, getDefenderHeroes } = require('./battle');
const { getDefenseBonus } = require('./buildings');
const { heroTroopsPower } = require('./troops');
const { addNotification } = require('./notification');
const { addPlayerXp, xpForActivity } = require('./xp');
const { sendToRest } = require('./rest');

async function findPvPTargets(a){const db=getSupabase();const{data}=await db.from('players').select('telegram_id, commander_name, level, gold').neq('telegram_id',a).gt('level',0).limit(5);return data||[];}
function calcPower(hs){return hs.reduce((s,h)=>s+h.template.base_attack+h.template.base_defense+h.level*5+heroTroopsPower(h),0);}

async function executePvP(attackerId, defenderId, selectedHeroIds) {
  const db=getSupabase();
  if(attackerId===defenderId)return{success:false,message:'❌ به خودت حمله نکن!'};
  const all=await getAttackHeroes(attackerId);
  const selected=all.filter(h=>selectedHeroIds.includes(h.id));
  if(selected.length===0)return{success:false,message:'❌ قهرمانی انتخاب نکردی!'};
  const defHeroes=await getDefenderHeroes(defenderId);
  const defBonus=await getDefenseBonus(defenderId);
  const atkP=calcPower(selected)+Math.floor(Math.random()*20);
  const defP=(defHeroes.length>0?calcPower(defHeroes.slice(0,3)):20)+defBonus+Math.floor(Math.random()*20);
  const atkWins=atkP>=defP; const winner=atkWins?attackerId:defenderId;
  let goldStolen=0;
  if(atkWins){const{data,error}=await db.rpc('steal_gold',{p_attacker:attackerId,p_defender:defenderId,p_max:500});if(!error&&typeof data==='number')goldStolen=data;}
  for(const hero of selected){const dmg=Math.floor(Math.random()*15)+5;const nhp=hero.current_health-dmg;if(nhp<=0)await sendToRest(db,hero);else await db.from('player_characters').update({current_health:nhp}).eq('id',hero.id);}
  if(atkWins){for(const dh of defHeroes.slice(0,3)){const dmg=Math.floor(Math.random()*20)+10;const nhp=dh.current_health-dmg;if(nhp<=0)await sendToRest(db,dh);else await db.from('player_characters').update({current_health:nhp}).eq('id',dh.id);}}
  const{data:defender}=await db.from('players').select('gold, commander_name').eq('telegram_id',defenderId).single();
  const{data:attacker}=await db.from('players').select('gold, commander_name').eq('telegram_id',attackerId).single();
  await db.from('pvp_battles').insert({attacker_id:attackerId,defender_id:defenderId,winner_id:winner,gold_stolen:goldStolen,attacker_power:atkP,defender_power:defP});
  await addPlayerXp(attackerId,xpForActivity(atkWins?'pvp_win':'pvp_lose'));
  await addPlayerXp(defenderId,xpForActivity(atkWins?'pvp_lose':'pvp_win'));
  if(atkWins)await addNotification(defenderId,'attack',`${attacker.commander_name} به شما حمله کرد و پیروز شد!`,attacker.commander_name,goldStolen);
  else await addNotification(defenderId,'defense',`شما حمله ${attacker.commander_name} را دفع کردید!`,attacker.commander_name,0);
  return{success:true,attackerWins:atkWins,attackerPower:atkP,defenderPower:defP,goldStolen,defenderName:defender.commander_name};
}

module.exports={findPvPTargets,executePvP};