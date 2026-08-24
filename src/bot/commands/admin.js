const { isAdmin, createGiftCode, getAllGiftCodes, toggleGiftCode, deleteGiftCode, addResources } = require('../../game/gift');
const { getAllItems } = require('../../game/shop');
const { getSupabase } = require('../../core/supabase');
const { formatGold, cb } = require('../../core/helpers');

const adminState = new Map();
function getState(id) { if (!adminState.has(id)) adminState.set(id, { step: null, data: {} }); return adminState.get(id); }
function clearState(id) { adminState.delete(id); }
async function getChars() { const db = getSupabase(); const { data } = await db.from('character_templates').select('*').order('price_gold'); return data || []; }

module.exports = function registerAdmin(bot) {

  bot.command('admin', async (ctx) => { if (!(await isAdmin(ctx.from.id))) return ctx.reply('⛔ شما دسترسی ندارید!'); clearState(ctx.from.id); await showAdminPanel(ctx); });
  bot.action(/^admin\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; clearState(ctx.from.id); await showAdminPanel(ctx); });

  // ═══ مدیریت قهرمان‌ها ═══
  bot.action(/^admin_heroes\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await showHeroesList(ctx); });
  bot.action(/^ah_edit_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await showHeroEdit(ctx, parseInt(ctx.match[1])); });
  bot.action(/^ah_create\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; getState(ctx.from.id).step = 'create_name'; getState(ctx.from.id).data = {}; await ctx.reply('⚜️ نام قهرمان رو تایپ کن:', { reply_markup: { inline_keyboard: [[{ text: 'لغو', callback_data: cb('admin_heroes', ctx.from.id) }]] } }); });

  bot.action(/^ah_f_(\w+)_(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return;
    const names = { name:'نام', emoji:'ایموجی', base_health:'سلامتی', base_attack:'حمله', base_defense:'دفاع', price_gold:'قیمت سکه', price_gems:'قیمت الماس', troop_power:'قدرت سرباز', troops_per_level:'ظرفیت سرباز در لول', required_barracks:'پادگان لازم' };
    getState(ctx.from.id).step = 'edit_field'; getState(ctx.from.id).data = { field: ctx.match[1], idx: parseInt(ctx.match[2]) };
    await ctx.reply(`✏️ ${names[ctx.match[1]] || ctx.match[1]} جدید رو تایپ کن:`);
  });

  bot.action(/^ah_rarity_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const i = ctx.match[1], uid = ctx.from.id; await ctx.reply('کمیابی:', { reply_markup: { inline_keyboard: [[{ text:'معمولی', callback_data:`ah_setrarity_common_${i}|${uid}` },{ text:'کمیاب', callback_data:`ah_setrarity_rare_${i}|${uid}` }],[{ text:'حماسی', callback_data:`ah_setrarity_epic_${i}|${uid}` },{ text:'افسانه‌ای', callback_data:`ah_setrarity_legendary_${i}|${uid}` }]] } }); });
  bot.action(/^ah_setrarity_(\w+)_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await setHeroField(ctx, parseInt(ctx.match[2]), { rarity: ctx.match[1] }); });

  bot.action(/^ah_type_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const i = ctx.match[1], uid = ctx.from.id; await ctx.reply('نوع قهرمان:', { reply_markup: { inline_keyboard: [[{ text:'نزدیک‌زن', callback_data:`ah_settype_melee_${i}|${uid}` },{ text:'دورزن', callback_data:`ah_settype_ranged_${i}|${uid}` }],[{ text:'جادویی', callback_data:`ah_settype_magic_${i}|${uid}` },{ text:'سواره', callback_data:`ah_settype_cavalry_${i}|${uid}` }]] } }); });
  bot.action(/^ah_settype_(\w+)_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await setHeroField(ctx, parseInt(ctx.match[2]), { type: ctx.match[1] }); });

  bot.action(/^ah_troop_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const i = ctx.match[1], uid = ctx.from.id; await ctx.reply('نوع سرباز اختصاصی:', { reply_markup: { inline_keyboard: [[{ text:'نیزه‌دار', callback_data:`ah_settroop_spear_${i}|${uid}` },{ text:'کماندار', callback_data:`ah_settroop_archer_${i}|${uid}` }],[{ text:'شوالیه', callback_data:`ah_settroop_knight_${i}|${uid}` },{ text:'منجنیق', callback_data:`ah_settroop_catapult_${i}|${uid}` }]] } }); });
  bot.action(/^ah_settroop_(\w+)_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await setHeroField(ctx, parseInt(ctx.match[2]), { troop_type: ctx.match[1] }); });

  bot.action(/^ah_hide_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const chars = await getChars(); const h = chars[parseInt(ctx.match[1])]; await setHeroFieldRaw(ctx, h.id, { hidden: !h.hidden }); });
  bot.action(/^ah_img_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const chars = await getChars(); const h = chars[parseInt(ctx.match[1])]; getState(ctx.from.id).step = 'img_hero'; getState(ctx.from.id).data = { heroId: h.id }; await ctx.reply(`📸 تصویر ${h.name} رو بفرست:`); });

  bot.action(/^ah_del_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const i = ctx.match[1], uid = ctx.from.id; await ctx.reply('⚠️ برای همیشه حذف میشه. مطمئنی؟', { reply_markup: { inline_keyboard: [[{ text:'بله، حذف کن', callback_data:`ah_delconfirm_${i}|${uid}` }],[{ text:'خیر', callback_data:`ah_edit_${i}|${uid}` }]] } }); });
  bot.action(/^ah_delconfirm_(\d+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const chars = await getChars(); const h = chars[parseInt(ctx.match[1])]; const db = getSupabase(); await db.from('player_characters').delete().eq('template_id', h.id); await db.from('character_templates').delete().eq('id', h.id); await ctx.answerCbQuery('حذف شد', { show_alert: true }); await showHeroesList(ctx); });

  // ═══ تصویر آیتم‌های فروشگاه ═══
  bot.action(/^admin_items_img\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return;
    const items = await getAllItems(); const uid = ctx.from.id;
    let msg = '🛒 *تصویر آیتم‌های فروشگاه*\n\nبرای کدوم تصویر بفرست؟\n\n';
    const buttons = [];
    for (let i = 0; i < items.length; i += 2) {
      const row = [];
      row.push({ text: items[i].name, callback_data: `ai_img_${i}|${uid}` });
      if (i + 1 < items.length) row.push({ text: items[i + 1].name, callback_data: `ai_img_${i + 1}|${uid}` });
      buttons.push(row);
    }
    buttons.push([{ text: 'بازگشت', callback_data: cb('admin', uid) }]);
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^ai_img_(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return;
    const items = await getAllItems(); const item = items[parseInt(ctx.match[1])];
    if (!item) return;
    getState(ctx.from.id).step = 'img_item'; getState(ctx.from.id).data = { itemId: item.id };
    await ctx.reply(`📸 تصویر ${item.name} رو بفرست:`);
  });

  // ═══ بقیه بخش‌ها ═══
  bot.action(/^admin_create_gift\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; getState(ctx.from.id).step='gift_code'; getState(ctx.from.id).data={}; await ctx.reply('🎁 کد هدیه رو تایپ کن:', { reply_markup: { inline_keyboard: [[{ text:'لغو', callback_data: cb('admin', ctx.from.id) }]] } }); });
  bot.action(/^admin_add_resources\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; getState(ctx.from.id).step='resource_user_id'; getState(ctx.from.id).data={}; await ctx.reply('💰 آیدی عددی کاربر:', { reply_markup: { inline_keyboard: [[{ text:'لغو', callback_data: cb('admin', ctx.from.id) }]] } }); });
  bot.action(/^admin_broadcast\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; getState(ctx.from.id).step='broadcast'; getState(ctx.from.id).data={}; await ctx.reply('📢 پیامت رو تایپ کن:', { reply_markup: { inline_keyboard: [[{ text:'لغو', callback_data: cb('admin', ctx.from.id) }]] } }); });
  bot.action(/^admin_gift_all\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; getState(ctx.from.id).step='gift_all_gold'; getState(ctx.from.id).data={}; await ctx.reply('🎁 چقدر سکه به هر کاربر؟', { reply_markup: { inline_keyboard: [[{ text:'لغو', callback_data: cb('admin', ctx.from.id) }]] } }); });
  bot.action(/^admin_stats\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await showStats(ctx); });
  bot.action(/^admin_list_gifts\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await showGiftList(ctx); });
  bot.action(/^admin_toggle\|(.+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await toggleGiftCode(ctx.match[1]); await showGiftList(ctx); });
  bot.action(/^admin_delete\|(.+)\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await deleteGiftCode(ctx.match[1]); await showGiftList(ctx); });
  bot.action(/^admin_sync_groups\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; await showGroups(ctx); });
  bot.action(/^admin_img_realm\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; getState(ctx.from.id).step='img_realm'; getState(ctx.from.id).data={}; await ctx.reply('📸 تصویر پس‌زمینه قلمرو رو بفرست:'); });

  bot.action(/^admin_confirm_gift\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const s=getState(ctx.from.id); if(s.step!=='gift_confirm')return; const r=await createGiftCode(s.data.code,s.data.gold,s.data.gems,s.data.maxUses,s.data.expiresAt); clearState(ctx.from.id); await ctx.reply(r.success?`🎉 کد \`${s.data.code}\` ساخته شد!`:r.message,{parse_mode:'Markdown'}); await showAdminPanel(ctx); });
  bot.action(/^admin_confirm_broadcast\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const s=getState(ctx.from.id); if(s.step!=='broadcast_confirm')return; const db=getSupabase(); clearState(ctx.from.id); const {data:pl}=await db.from('players').select('telegram_id'); let su=0,fu=0; for(const p of pl||[]){try{await ctx.telegram.sendMessage(p.telegram_id,s.data.message);su++;}catch(e){fu++;}} const {data:gr}=await db.from('bot_groups').select('group_id'); let sg=0,fg=0; for(const g of gr||[]){try{await ctx.telegram.sendMessage(g.group_id,s.data.message);sg++;}catch(e){fg++;}} await ctx.reply(`📢 کاربران:${su}/${fu} گروه‌ها:${sg}/${fg}`); await showAdminPanel(ctx); });
  bot.action(/^admin_confirm_gift_all\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); if (!(await isAdmin(ctx.from.id))) return; const s=getState(ctx.from.id); if(s.step!=='gift_all_confirm')return; const db=getSupabase(); const {data:pl}=await db.from('players').select('telegram_id,gold'); clearState(ctx.from.id); let c=0; for(const p of pl||[]){await db.from('players').update({gold:p.gold+s.data.gold}).eq('telegram_id',p.telegram_id);c++;} await ctx.reply(`🎁 ${formatGold(s.data.gold)} به ${c} کاربر`); await showAdminPanel(ctx); });

  // ═══ دریافت عکس ═══
  bot.on('photo', async (ctx, next) => {
    if (!(await isAdmin(ctx.from.id))) return next();
    const s = getState(ctx.from.id);
    if (!s.step || !s.step.startsWith('img_')) return next();
    const fileId = ctx.message.photo[ctx.message.photo.length-1].file_id;
    const db = getSupabase();
    if (s.step==='img_hero') { await db.from('character_templates').update({ image_url: fileId }).eq('id', s.data.heroId); await ctx.reply('✅ تصویر قهرمان ذخیره شد!'); }
    else if (s.step==='img_item') { await db.from('shop_items').update({ image_url: fileId }).eq('id', s.data.itemId); await ctx.reply('✅ تصویر آیتم ذخیره شد!'); }
    else if (s.step==='img_realm') { await db.from('bot_assets').upsert({ key:'realm_bg', file_id: fileId }); await ctx.reply('✅ پس‌زمینه قلمرو ذخیره شد!'); }
    clearState(ctx.from.id);
  });

  // ═══ دریافت متن ═══
  bot.on('text', async (ctx, next) => {
    if (!(await isAdmin(ctx.from.id))) return next();
    const s = getState(ctx.from.id);
    if (!s.step) return next();
    const text = ctx.message.text.trim();
    if (text.startsWith('/')) { clearState(ctx.from.id); return next(); }

    if (s.step==='create_name') {
      const db = getSupabase();
      const { data } = await db.from('character_templates').insert({ name: text, type:'melee', rarity:'common', base_health:100, base_attack:20, base_defense:10, price_gold:500, price_gems:0, troop_type:'spear', troop_power:2, troops_per_level:2, required_barracks:1, hidden:false }).select().single();
      clearState(ctx.from.id);
      await ctx.reply(`✅ ${text} ساخته شد! حالا مشخصاتش رو تنظیم کن.`);
      const chars = await getChars(); const idx = chars.findIndex(c=>c.id===data.id);
      await showHeroEdit(ctx, idx); return;
    }
    if (s.step==='edit_field') {
      const { field, idx } = s.data;
      const textFields = ['name', 'emoji'];
      const value = textFields.includes(field) ? text : (parseInt(text) || 0);
      const chars = await getChars(); const h = chars[idx];
      await setHeroFieldRaw(ctx, h.id, { [field]: value });
      clearState(ctx.from.id); return;
    }
    if (s.step==='gift_code') { s.data.code=text.toUpperCase(); s.step='gift_gold'; await ctx.reply(`کد: ${s.data.code}\nچقدر سکه؟`); return; }
    if (s.step==='gift_gold') { s.data.gold=parseInt(text)||0; s.step='gift_gems'; await ctx.reply(`سکه:${s.data.gold}\nچقدر الماس؟`); return; }
    if (s.step==='gift_gems') { s.data.gems=parseInt(text)||0; s.step='gift_max_uses'; await ctx.reply(`الماس:${s.data.gems}\nتعداد مجاز؟ (0=نامحدود)`); return; }
    if (s.step==='gift_max_uses') { s.data.maxUses=parseInt(text)||0; s.step='gift_expiry'; await ctx.reply(`تعداد:${s.data.maxUses}\nساعت انقضا؟ (0=هیچ)`); return; }
    if (s.step==='gift_expiry') { const h=parseInt(text)||0; s.data.expiresAt=h>0?new Date(Date.now()+h*3600000).toISOString():null; s.step='gift_confirm'; await ctx.reply('✅ بسازم؟',{reply_markup:{inline_keyboard:[[{text:'بله',callback_data:cb('admin_confirm_gift',ctx.from.id)}],[{text:'خیر',callback_data:cb('admin',ctx.from.id)}]]}}); return; }
    if (s.step==='resource_user_id') { s.data.targetId=parseInt(text); if(!s.data.targetId)return ctx.reply('❌ دوباره بفرست'); s.step='resource_gold'; await ctx.reply(`آیدی:${s.data.targetId}\nچقدر سکه؟`); return; }
    if (s.step==='resource_gold') { s.data.gold=parseInt(text)||0; s.step='resource_gems'; await ctx.reply(`سکه:${s.data.gold}\nچقدر الماس؟`); return; }
    if (s.step==='resource_gems') { s.data.gems=parseInt(text)||0; const r=await addResources(s.data.targetId,s.data.gold,s.data.gems); clearState(ctx.from.id); await ctx.reply(r.success?'✅ اضافه شد':r.message); return; }
    if (s.step==='broadcast') { s.data.message=text; s.step='broadcast_confirm'; await ctx.reply('✅ بفرستم؟',{reply_markup:{inline_keyboard:[[{text:'بله',callback_data:cb('admin_confirm_broadcast',ctx.from.id)}],[{text:'خیر',callback_data:cb('admin',ctx.from.id)}]]}}); return; }
    if (s.step==='gift_all_gold') { s.data.gold=parseInt(text)||0; s.step='gift_all_confirm'; await ctx.reply('✅ بفرستم؟',{reply_markup:{inline_keyboard:[[{text:'بله',callback_data:cb('admin_confirm_gift_all',ctx.from.id)}],[{text:'خیر',callback_data:cb('admin',ctx.from.id)}]]}}); return; }
    return next();
  });

  async function setHeroField(ctx, idx, updates) { const chars = await getChars(); await setHeroFieldRaw(ctx, chars[idx].id, updates); }
  async function setHeroFieldRaw(ctx, heroId, updates) {
    const db = getSupabase();
    await db.from('character_templates').update(updates).eq('id', heroId);
    await ctx.answerCbQuery('✅ ذخیره شد');
    const chars = await getChars(); const idx = chars.findIndex(c=>c.id===heroId);
    if (idx>=0) await showHeroEdit(ctx, idx);
  }

  async function showHeroesList(ctx) {
    const chars = await getChars(); const uid = ctx.from.id;
    let msg = '🦸 *مدیریت قهرمان‌ها*\n\n'; const buttons = [];
    for (let i=0;i<chars.length;i+=2){ const row=[]; row.push({text:chars[i].name,callback_data:`ah_edit_${i}|${uid}`}); if(i+1<chars.length)row.push({text:chars[i+1].name,callback_data:`ah_edit_${i+1}|${uid}`}); buttons.push(row); }
    buttons.push([{ text:'ساخت قهرمان جدید', callback_data: cb('ah_create', uid) }]);
    buttons.push([{ text:'بازگشت', callback_data: cb('admin', uid) }]);
    await ctx.reply(msg,{parse_mode:'Markdown',reply_markup:{inline_keyboard:buttons}});
  }

  async function showHeroEdit(ctx, idx) {
    const chars = await getChars(); const h = chars[idx]; if(!h) return; const uid = ctx.from.id;
    let msg = `✏️ *${h.name}*\n\n`;
    msg += `ایموجی:${h.emoji || '⚔️'} | سلامتی:${h.base_health} حمله:${h.base_attack} دفاع:${h.base_defense}\n`;
    msg += `قیمت:💰${h.price_gold} 💎${h.price_gems} | کمیابی:${h.rarity}\n`;
    msg += `نوع:${h.type} | سرباز:${h.troop_type} قدرت:${h.troop_power} ظرفیت/لول:${h.troops_per_level}\n`;
    msg += `🏰 پادگان لازم: Lv.${h.required_barracks || 1}\n`;
    msg += `وضعیت:${h.hidden?'مخفی':'نمایش'} ${h.image_url?'| 🖼 دارد':''}`;
    await ctx.reply(msg,{parse_mode:'Markdown',reply_markup:{inline_keyboard:[
      [{text:'نام',callback_data:`ah_f_name_${idx}|${uid}`},{text:'ایموجی',callback_data:`ah_f_emoji_${idx}|${uid}`}],
      [{text:'سلامتی',callback_data:`ah_f_base_health_${idx}|${uid}`},{text:'حمله',callback_data:`ah_f_base_attack_${idx}|${uid}`}],
      [{text:'دفاع',callback_data:`ah_f_base_defense_${idx}|${uid}`},{text:'قیمت سکه',callback_data:`ah_f_price_gold_${idx}|${uid}`}],
      [{text:'قیمت الماس',callback_data:`ah_f_price_gems_${idx}|${uid}`},{text:'کمیابی',callback_data:`ah_rarity_${idx}|${uid}`}],
      [{text:'نوع قهرمان',callback_data:`ah_type_${idx}|${uid}`},{text:'نوع سرباز',callback_data:`ah_troop_${idx}|${uid}`}],
      [{text:'قدرت سرباز',callback_data:`ah_f_troop_power_${idx}|${uid}`},{text:'ظرفیت سرباز',callback_data:`ah_f_troops_per_level_${idx}|${uid}`}],
      [{text:'پادگان لازم',callback_data:`ah_f_required_barracks_${idx}|${uid}`},{text:'تصویر',callback_data:`ah_img_${idx}|${uid}`}],
      [{text:h.hidden?'نمایش در فروشگاه':'مخفی کن',callback_data:`ah_hide_${idx}|${uid}`},{text:'حذف',callback_data:`ah_del_${idx}|${uid}`}],
      [{text:'بازگشت به لیست',callback_data:cb('admin_heroes',uid)}]
    ]}});
  }

  async function showGroups(ctx) { const db=getSupabase(); const {data:g}=await db.from('bot_groups').select('*'); let msg='🔄 *گروه‌ها*\n\n'; if(!g||g.length===0)msg+='📭 خالی'; else g.forEach(x=>msg+=`• ${x.group_name||'-'}\n`); await ctx.reply(msg,{parse_mode:'Markdown',reply_markup:{inline_keyboard:[[{text:'بازگشت',callback_data:cb('admin',ctx.from.id)}]]}}); }

  async function showStats(ctx) { const db=getSupabase(); const {count:pc}=await db.from('players').select('*',{count:'exact',head:true}); const {count:hc}=await db.from('player_characters').select('*',{count:'exact',head:true}); const {count:bc}=await db.from('battles').select('*',{count:'exact',head:true}); const {count:gc}=await db.from('bot_groups').select('*',{count:'exact',head:true}); await ctx.reply(`📊 *آمار*\n\n👥 بازیکنان:${pc||0}\n🦸 قهرمانان:${hc||0}\n⚔️ جنگ‌ها:${bc||0}\n👥 گروه‌ها:${gc||0}`,{parse_mode:'Markdown',reply_markup:{inline_keyboard:[[{text:'بازگشت',callback_data:cb('admin',ctx.from.id)}]]}}); }

  async function showGiftList(ctx) { const codes=await getAllGiftCodes(); const uid=ctx.from.id; if(codes.length===0)return ctx.reply('📭 خالی',{reply_markup:{inline_keyboard:[[{text:'ساخت',callback_data:cb('admin_create_gift',uid)}],[{text:'بازگشت',callback_data:cb('admin',uid)}]]}}); let msg='🎁 *کدها*\n\n'; const buttons=[]; codes.forEach(c=>{msg+=`${c.is_active?'🟢':''} \`${c.code}\` 💰${c.gold_reward} 💎${c.gems_reward}\n`; buttons.push([{text:c.is_active?'غیرفعال':'فعال',callback_data:`admin_toggle|${c.id}|${uid}`},{text:'حذف',callback_data:`admin_delete|${c.id}|${uid}`}]);}); buttons.push([{text:'بازگشت',callback_data:cb('admin',uid)}]); await ctx.reply(msg,{parse_mode:'Markdown',reply_markup:{inline_keyboard:buttons}}); }

  async function showAdminPanel(ctx) {
    const db=getSupabase(); const {count:pc}=await db.from('players').select('*',{count:'exact',head:true}); const uid=ctx.from.id;
    let msg=`👑 *پنل مدیریت*\n\n👥 بازیکنان:${pc||0}\n\nخوش آمدی!`;
    await ctx.reply(msg,{parse_mode:'Markdown',reply_markup:{inline_keyboard:[
      [{ text:'مدیریت قهرمان‌ها', callback_data: cb('admin_heroes', uid) }],
      [{ text:'تصویر آیتم‌های فروشگاه', callback_data: cb('admin_items_img', uid) }],
      [{ text:'ساخت کد هدیه', callback_data: cb('admin_create_gift', uid) }],
      [{ text:'لیست کدها', callback_data: cb('admin_list_gifts', uid) }],
      [{ text:'سکه به کاربر', callback_data: cb('admin_add_resources', uid) }],
      [{ text:'هدیه به همه', callback_data: cb('admin_gift_all', uid) }],
      [{ text:'پیام همگانی', callback_data: cb('admin_broadcast', uid) }],
      [{ text:'آمار', callback_data: cb('admin_stats', uid) }, { text:'گروه‌ها', callback_data: cb('admin_sync_groups', uid) }],
      [{ text:'تصویر قلمرو', callback_data: cb('admin_img_realm', uid) }],
      [{ text:'بازگشت', callback_data: cb('mainmenu', uid) }]
    ]}});
  }
};