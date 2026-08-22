const { SKINS, WEAPONS, applySkin, equipWeapon } = require('../../game/cosmetics');
const { getSupabase } = require('../../core/supabase');
const { smartReply, cb } = require('../../core/helpers');

module.exports = function registerCosmetics(bot) {

  // ═══ منوی ظاهر و سلاح ═══
  bot.action(/^cosmetics\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const heroId = ctx.match[1];
    const uid = ctx.from.id;
    const db = getSupabase();
    const { data: hero } = await db.from('player_characters')
      .select('skin, weapon, template:character_templates (name, type, image_url)')
      .eq('id', heroId).single();
    if (!hero) return;

    const isCavalry = (hero.template.name || '').includes('سواره');
    let msg = `🎭 *${hero.template.name}*\n\n`;
    msg += `🎨 اسکین: ${SKINS[hero.skin]?.emoji || ''} ${SKINS[hero.skin]?.name || 'معمولی'}\n`;
    msg += `⚔️ سلاح: ${WEAPONS[hero.weapon]?.emoji || ''} ${WEAPONS[hero.weapon]?.name || 'بدون سلاح'}\n`;

    const buttons = [
      [{ text: '🎨 اسکین‌ها', callback_data: `skins|${heroId}|${uid}` }, { text: '⚔️ سلاح‌ها', callback_data: `weapons|${heroId}|${uid}` }]
    ];
    if (isCavalry) buttons.push([{ text: '🔄 تبدیل سواره‌نظام', callback_data: `convert|${heroId}|${uid}` }]);
    buttons.push([{ text: '🔙', callback_data: `hero|${heroId}|${uid}` }]);

    if (hero.template.image_url) {
      await ctx.telegram.sendPhoto(ctx.chat.id, hero.template.image_url, {
        caption: msg, parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons }
      });
    } else {
      await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
    }
  });

  // ═══ لیست اسکین‌ها ═══
  bot.action(/^skins\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const heroId = ctx.match[1];
    const uid = ctx.from.id;
    let msg = '🎨 *اسکین‌ها*\n\n';
    const buttons = [];
    for (const [key, s] of Object.entries(SKINS)) {
      if (key === 'none') continue;
      const bonus = Object.entries(s.bonus).map(([k, v]) => `+${v} ${k === 'attack' ? 'حمله' : k === 'defense' ? 'دفاع' : 'سلامتی'}`).join(' ');
      msg += `${s.emoji} *${s.name}* | 💎${s.price_gems} | ${bonus}\n`;
      buttons.push([{ text: `${s.emoji} ${s.name} (💎${s.price_gems})`, callback_data: `buy_skin_${key}|${heroId}|${uid}` }]);
    }
    buttons.push([{ text: '🔙', callback_data: `cosmetics|${heroId}|${uid}` }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^buy_skin_(\w+)\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await applySkin(ctx.from.id, ctx.match[2], ctx.match[1]);
    await ctx.answerCbQuery(result.success ? '✅ اسکین اعمال شد!' : result.message, { show_alert: true });
  });

  // ═══ لیست سلاح‌ها (آهنگری) ═══
  bot.action(/^weapons\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const heroId = ctx.match[1];
    const uid = ctx.from.id;
    let msg = '⚒️ *سلاح‌های آهنگری*\n\n';
    const buttons = [];
    for (const [key, w] of Object.entries(WEAPONS)) {
      if (key === 'none') continue;
      msg += `${w.emoji} *${w.name}* | ⚡+${w.power} | ⚙️${w.cost_iron}\n`;
      buttons.push([{ text: `${w.emoji} ${w.name} (⚙️${w.cost_iron})`, callback_data: `craft_weapon_${key}|${heroId}|${uid}` }]);
    }
    buttons.push([{ text: '🔙', callback_data: `cosmetics|${heroId}|${uid}` }]);
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^craft_weapon_(\w+)\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await equipWeapon(ctx.from.id, ctx.match[2], ctx.match[1]);
    await ctx.answerCbQuery(result.success ? '✅ سلاح ساخته و تجهیز شد!' : result.message, { show_alert: true });
  });

  // ═══ تبدیل سواره‌نظام ═══
  bot.action(/^convert\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const heroId = ctx.match[1];
    const uid = ctx.from.id;
    await smartReply(ctx, '🔄 *تبدیل سواره‌نظام*\n\nبه کدوم تبدیل بشه؟ (💎100)', {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [
        [{ text: '🖤 شوالیه سیاه', callback_data: `convert_black_knight|${heroId}|${uid}` }],
        [{ text: '🏹 سواره کماندار', callback_data: `convert_mounted_archer|${heroId}|${uid}` }],
        [{ text: '🔙', callback_data: `cosmetics|${heroId}|${uid}` }]
      ] }
    });
  });

  bot.action(/^convert_(\w+)\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const type = ctx.match[1];
    const heroId = ctx.match[2];
    const db = getSupabase();
    const { data: player } = await db.from('players').select('gems').eq('telegram_id', ctx.from.id).single();
    if (player.gems < 100) return ctx.answerCbQuery('❌ الماس کافی نداری! (100)', { show_alert: true });
    const name = type === 'black_knight' ? '🖤 شوالیه سیاه' : '🏹 سواره کماندار';
    const { data: tpl } = await db.from('character_templates').select('id').eq('name', name).maybeSingle();
    if (!tpl) return ctx.answerCbQuery('❌ قالب پیدا نشد!', { show_alert: true });
    await db.from('players').update({ gems: player.gems - 100 }).eq('telegram_id', ctx.from.id);
    await db.from('player_characters').update({ template_id: tpl.id }).eq('id', heroId);
    await ctx.answerCbQuery(`✅ به ${name} تبدیل شد!`, { show_alert: true });
  });
};