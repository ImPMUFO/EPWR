const { getSupabase } = require('../core/supabase');
const { addNotification } = require('./notification');
const { sendToRest } = require('./rest');

const FOOD_PER_HERO_PER_DAY = 10;

async function processFoodConsumption(telegramId) {
  const db=getSupabase(); const now=new Date();
  const{data:player}=await db.from('players').select('*').eq('telegram_id',telegramId).single();
  if(!player)return;
  const last=new Date(player.last_food_tick||now);
  const hours=Math.floor((now-last)/(1000*60*60));
  if(hours<24)return;
  const days=Math.min(Math.floor(hours/24),7);
  const{data:heroes}=await db.from('player_characters').select('id, current_health, template:character_templates (name, base_health, base_attack, base_defense)').eq('telegram_id',telegramId).gt('current_health',0);
  if(!heroes||heroes.length===0){await db.from('players').update({last_food_tick:now.toISOString()}).eq('telegram_id',telegramId);return;}
  const need=heroes.length*FOOD_PER_HERO_PER_DAY*days;
  const avail=player.food||0;
  if(avail>=need){await db.from('players').update({food:avail-need,last_food_tick:now.toISOString()}).eq('telegram_id',telegramId);return;}
  const ratio=need>0?avail/need:1;
  const dmg=Math.floor(20*(1-ratio)*days);
  const rested=[];
  if(dmg>0){for(const h of heroes){const nhp=h.current_health-dmg;if(nhp<=0){await sendToRest(db,h);rested.push(h.template.name);}else await db.from('player_characters').update({current_health:nhp}).eq('id',h.id);}}
  await db.from('players').update({food:0,last_food_tick:now.toISOString()}).eq('telegram_id',telegramId);
  if(rested.length>0)await addNotification(telegramId,'starve',`🛌 قهرمان‌هات از گرسنگی به پادگان رفتن: ${rested.join('، ')}`,null,0);
  else if(dmg>0)await addNotification(telegramId,'starve',`🍖 قهرمان‌هات گشنه موندن و ضعیف شدن! (-${dmg} ❤)`,null,0);
}

async function buyFood(telegramId,amount){const db=getSupabase();const cost=amount;const{data:p}=await db.from('players').select('*').eq('telegram_id',telegramId).single();if(p.gold<cost)return{success:false,message:`❌ Gold کافی نداری! نیاز: ${cost}`};const nf=Math.min((p.food||0)+amount,p.food_capacity||1000);await db.from('players').update({gold:p.gold-cost,food:nf}).eq('telegram_id',telegramId);return{success:true};}

module.exports={FOOD_PER_HERO_PER_DAY,processFoodConsumption,buyFood};