const { findPvPTargets, executePvP } = require('../../game/pvp');
const { getPlayerHeroes, getSession, clearSession } = require('../../game/battle');
const { getSupabase } = require('../../core/supabase');
const { formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerPvP(bot) {
  
  // ═══ ورود به PvP ═══
  bot.action(/^battle_pvp\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showRandomOpponent(ctx);
  });

  // ═══ نمایش حریف تصادفی ═══
  async function showRandomOpponent(ctx) {
    const targets = await findPvPTargets(ctx.from.id);
    if (targets.length === 0) {
      return ctx.editMessageText('👥 بازیکنی برای جنگ نیست!', {
        reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('battle', ctx.from.id) }]] }
      });
    }
    
    const target = targets[Math.floor(Math.random() * targets.length)];
    const uid = ctx.from.id;
    const skipCost = target.level * 10;
    
    let msg = `👥 *جنگ PvP*\n\n`;
    msg += `🎯 حریف تصادفی:\n\n`;
    msg += `👤 *${target.commander_name}*\n`;
    msg += `⭐ Lv.${target.level}\n\n`;
    msg += `💡 حمله می‌کنی یا بازیکن بعدی؟\n\n`;
    msg += `💰 هزینه بازیکن بعدی: ${skipCost} سکه`;
    
    const buttons = [
      [{ text: `⚔️ حمله به ${target.commander_name}`, callback_data: `pvp_target|${target.telegram_id}|${uid}` }],
      [{ text: `🔄 بازیکن بعدی (-${skipCost}💰)`, callback_data: `pvp_next|${target.telegram_id}|${uid}` }],
      [{ text: '🔙 بازگشت', callback_data: cb('battle', uid) }]
    ];
    
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  // ═══ بازیکن بعدی ═══
  bot.action(/^pvp_next\|(\d+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const previousTargetId = parseInt(ctx.match[1]);
    const uid = ctx.from.id;
    
    const db = getSupabase();
    const { data: prevPlayer } = await db.from('players')
      .select('level')
      .eq('telegram_id', previousTargetId)
      .single();
    
    const skipCost = prevPlayer ? prevPlayer.level * 10 : 20;
    
    // چک کردن سکه کافی
    const { data: player } = await db.from('players').select('gold').eq('telegram_id', uid).single();
    if (!player) return ctx.answerCbQuery('❌ بازیکن پیدا نشد!', { show_alert: true });
    
    if (player.gold < skipCost) {
      return ctx.answerCbQuery(`❌ سکه کافی نداری! نیاز: ${skipCost}`, { show_alert: true });
    }
    
    // کسر سکه
    await db.from('players').update({ gold: player.gold - skipCost }).eq('telegram_id', uid);
    
    await ctx.answerCbQuery(`💰 -${skipCost} سکه کسر شد!`, { show_alert: true });
    await showRandomOpponent(ctx);
  });

  // ═══ انتخاب حریف ═══
  bot.action(/^pvp_target\|(\d+)\|(\d+)$/, async (ctx) => {
    const session = getSession(ctx.from.id);
    session.target = parseInt(ctx.match[1]);
    session.targetType = 'pvp';
    session.selectedHeroes = [];
    await ctx.answerCbQuery();
    await showHeroSelectionPvP(ctx);
  });

  // ═══ انتخاب قهرمان PvP ═══
  bot.action(/^toggle_hero_pvp\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const session = getSession(ctx.from.id);
    const heroId = ctx.match[1];
    const idx = session.selectedHeroes.indexOf(heroId);
    if (idx >= 0) session.selectedHeroes.splice(idx, 1);
    else session.selectedHeroes.push(heroId);
    await showHeroSelectionPvP(ctx);
  });

  // ═══ تأیید حمله PvP ═══
  bot.action(/^pvp_confirm\|(\d+)$/, async (ctx) => {
    const session = getSession(ctx.from.id);
    if (session.selectedHeroes.length === 0) return ctx.answerCbQuery('⚠️ قهرمان انتخاب کن!', { show_alert: true });
    await ctx.answerCbQuery();
    const result = await executePvP(ctx.from.id, session.target, session.selectedHeroes);
    clearSession(ctx.from.id);
    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });
    
    try {
      if (result.attackerWins) {
        await ctx.telegram.sendMessage(session.target,
          `⚔️ *حمله به شما!*\n\n👤 *${ctx.from.first_name || 'فرمانده'}* به قلمرو شما حمله کرد!\n💰 ${result.goldStolen} Gold دزدیده شد!`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.telegram.sendMessage(session.target,
          `🛡️ *دفاع موفق!*\n\nشما حمله *${ctx.from.first_name || 'فرمانده'}* را دفع کردید!`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch(e) {
      console.error('Send message error:', e.message);
    }
    
    let msg = result.attackerWins ? '🏆 *پیروزی!*\n' : '💀 *شکست!*\n';
    msg += `⚡ تو: ${result.attackerPower} | حریف: ${result.defenderPower}\n`;
    if (result.attackerWins && result.goldStolen > 0) msg += `💰 +${result.goldStolen}`;
    
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '⚔️ دوباره', callback_data: cb('battle_pvp', ctx.from.id) }], [{ text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]] } });
  });

  async function showHeroSelectionPvP(ctx) {
    const heroes = await getPlayerHeroes(ctx.from.id);
    const session = getSession(ctx.from.id);
    const uid = ctx.from.id;
    let msg = `🎯 *انتخاب قهرمان (PvP)*\n\n`;
    const buttons = [];
    for (let i = 0; i < heroes.length; i += 2) {
      const row = [];
      const h1 = heroes[i];
      const s1 = session.selectedHeroes.includes(h1.id);
      row.push({ text: `${s1 ? '✅' : '⬜'} ${h1.template.name}`, callback_data: `toggle_hero_pvp|${h1.id}|${uid}` });
      if (i + 1 < heroes.length) {
        const h2 = heroes[i + 1];
        const s2 = session.selectedHeroes.includes(h2.id);
        row.push({ text: `${s2 ? '✅' : '⬜'} ${h2.template.name}`, callback_data: `toggle_hero_pvp|${h2.id}|${uid}` });
      }
      buttons.push(row);
    }
    buttons.push([{ text: `⚔️ حمله (${session.selectedHeroes.length})`, callback_data: cb('pvp_confirm', uid) }, { text: '🔙', callback_data: cb('battle_pvp', uid) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};