const { SKINS, WEAPONS, applySkin, equipWeapon } = require('../../game/cosmetics');
const { getSupabase } = require('../../core/supabase');
const { smartReply, cb } = require('../../core/helpers');

module.exports = function registerCosmetics(bot) {

  bot.action(/^cosmetics\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const heroId = ctx.match[1]; const uid = ctx.from.id;
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters').select('skin, weapon, template:character_templates (name, type, image_url)').eq('id', heroId).single();
    if (!hero) return;
    const isCavalry = hero.template.type === 'cavalry';
    let msg = `🎭 *${hero.template.name}*\n\n`;
    msg += `🎨 اسکین: ${SKINS[hero.skin]?.emoji || ''} ${SKINS[hero.skin]?.name || 'معمولی'}\n`;
    msg += `⚔️ سلاح: ${WEAPONS[hero.weapon]?.emoji || ''} ${WEAPONS[hero.weapon]?.name || 'بدون سلاح'}\n`;
    const buttons = [[{ text:'🎨 اسکین‌ها', callback_data:`skins|${heroId}|${uid}` },{ text:'⚔️ سلاح‌ها', callback_data:`weapons|${heroId}|${uid}` }]];
    if (isCavalry) buttons.push([{ text:'🔄 تبدیل قهرمان', callback_data:`convert|${heroId}|${uid}` }]);
    buttons.push([{ text:'🔙', callback_data:`hero|${heroId}|${uid}` }]);
    if (hero.template.image_url) {
      await ctx.telegram.sendPhoto(ctx.chat.id, hero.template.image_url, { caption: msg, parse_mode:'Markdown', reply_markup:{ inline_keyboard: buttons } });
    } else await smartReply(ctx, msg, { parse_mode:'Markdown', reply_markup:{ inline_keyboard: buttons } });
  });

  bot.action(/^skins\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery(); const heroId = ctx.match[1]; const uid = ctx.from.id;
    let msg='🎨 *اسکین‌ها*\n\n'; const buttons=[];
    for (const [key,s] of Object.entries(SKINS)) { if(key==='none')continue; const bonus=Object.entries(s.bonus).map(([k,v])=>`+${v} ${k==='attack'?'حمله':k==='defense'?'دفاع':'سلامتی'}`).join(' '); msg+=`${s.emoji} *${s.name}* | 💎${s.price_gems} | ${bonus}\n`; buttons.push([{text:`${s.emoji} ${s.name} (💎${s.price_gems})`,callback_data:`buy_skin_${key}|${heroId}|${uid}`}]); }
    buttons.push([{text:'🔙',callback_data:`cosmetics|${heroId}|${uid}`}]);
    await smartReply(ctx,msg,{parse_mode:'Markdown',reply_markup:{inline_keyboard:buttons}});
  });
  bot.action(/^buy_skin_(\w+)\|(.+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); const r=await applySkin(ctx.from.id,ctx.match[2],ctx.match[1]); await ctx.answerCbQuery(r.success?'✅ اسکین اعمال شد!':r.message,{show_alert:true}); });

  bot.action(/^weapons\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery(); const heroId=ctx.match[1]; const uid=ctx.from.id;
    let msg='⚒️ *سلاح‌های آهنگری*\n\n'; const buttons=[];
    for (const [key,w] of Object.entries(WEAPONS)) { if(key==='none')continue; msg+=`${w.emoji} *${w.name}* | ⚡+${w.power} | ⚙️${w.cost_iron}\n`; buttons.push([{text:`${w.emoji} ${w.name} (⚙️${w.cost_iron})`,callback_data:`craft_weapon_${key}|${heroId}|${uid}`}]); }
    buttons.push([{text:'🔙',callback_data:`cosmetics|${heroId}|${uid}`}]);
    await smartReply(ctx,msg,{parse_mode:'Markdown',reply_markup:{inline_keyboard:buttons}});
  });
  bot.action(/^craft_weapon_(\w+)\|(.+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); const r=await equipWeapon(ctx.from.id,ctx.match[2],ctx.match[1]); await ctx.answerCbQuery(r.success?'✅ سلاح تجهیز شد!':r.message,{show_alert:true}); });

  // ═══ تبدیل پویا (قهرمان‌های مخفی) ═══
  bot.action(/^convert\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery(); const heroId=ctx.match[1]; const uid=ctx.from.id;
    const db=getSupabase();
    const { data: hidden } = await db.from('character_templates').select('id,name').eq('hidden', true);
    if (!hidden || hidden.length===0) return ctx.answerCbQuery('❌ گزینه‌ای برای تبدیل نیست!',{show_alert:true});
    const buttons = hidden.map((h,i)=>[{text:h.name,callback_data:`cnv_${i}|${heroId}|${uid}`}]);
    buttons.push([{text:'🔙',callback_data:`cosmetics|${heroId}|${uid}`}]);
    await smartReply(ctx,'🔄 *تبدیل قهرمان*\n\nبه کدوم تبدیل بشه؟ (💎100)',{parse_mode:'Markdown',reply_markup:{inline_keyboard:buttons}});
  });
  bot.action(/^cnv_(\d+)\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery(); const i=parseInt(ctx.match[1]); const heroId=ctx.match[2];
    const db=getSupabase();
    const { data: hidden } = await db.from('character_templates').select('*').eq('hidden', true);
    const tpl=hidden[i]; if(!tpl)return;
    const { data: player } = await db.from('players').select('gems').eq('telegram_id',ctx.from.id).single();
    if(player.gems<100)return ctx.answerCbQuery('❌ الماس کافی نداری! (100)',{show_alert:true});
    await db.from('players').update({gems:player.gems-100}).eq('telegram_id',ctx.from.id);
    await db.from('player_characters').update({template_id:tpl.id}).eq('id',heroId);
    await ctx.answerCbQuery(`✅ به ${tpl.name} تبدیل شد!`,{show_alert:true});
  });
};