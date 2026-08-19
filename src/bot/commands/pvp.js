const { findPvPTargets, executePvP } = require('../../game/pvp');
const { getPlayerHeroes, getSession, clearSession } = require('../../game/battle');
const { formatGold, reply, cb } = require('../../core/helpers');

module.exports = function registerPvP(bot) {

  bot.action(/pvp:uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const targets = await findPvPTargets(ctx.from.id);
    if (targets.length === 0) {
      return ctx.answerCbQuery('👥 بازیکنی نیست!', { show_alert: true });
    }

    const uid = ctx.from.id;
    let msg = `👥 *جنگ PvP*\n\n`;
    const buttons = [];
    targets.forEach(t => {
      msg += `👤 ${t.commander_name} Lv.${t.level}\n`;
      buttons.push([{ text: `⚔️ ${t.commander_name}`, callback_data: `pvp_target:${t.telegram_id}:uid:${uid}` }]);
    });
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('battle', uid) }]);
    await reply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/pvp_target:(\d+):uid:(\d+)/, async (ctx) => {
    const session = getSession(ctx.from.id);
    session.target = parseInt(ctx.match[1]);
    session.targetType = 'pvp';
    session.selectedHeroes = [];
    await ctx.answerCbQuery();
    await showHeroSelectionPvP(ctx);
  });

  bot.action(/toggle_hero_pvp:(.+):uid:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const session = getSession(ctx.from.id);
    const heroId = ctx.match[1];
    const idx = session.selectedHeroes.indexOf(heroId);
    if (idx >= 0) session.selectedHeroes.splice(idx, 1);
    else session.selectedHeroes.push(heroId);
    await showHeroSelectionPvP(ctx);
  });

  bot.action(/pvp_confirm:uid:(\d+)/, async (ctx) => {
    const session = getSession(ctx.from.id);
    if (session.selectedHeroes.length === 0) {
      return ctx.answerCbQuery('⚠️ قهرمان انتخاب کن!', { show_alert: true });
    }
    await ctx.answerCbQuery();

    const result = await executePvP(ctx.from.id, session.target, session.selectedHeroes);
    clearSession(ctx.from.id);

    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });

    let msg = result.attackerWins ? `🏆 *پیروزی!*\n` : `💀 *شکست!*\n`;
    msg += `⚡ تو: ${result.attackerPower} | حریف: ${result.defenderPower}\n`;
    if (result.attackerWins && result.goldStolen > 0) {
      msg += `💰 +${result.goldStolen} Gold`;
    }

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [
        [{ text: '⚔️ دوباره', callback_data: cb('battle', ctx.from.id) }],
        [{ text: '🔙 بازگشت', callback_data: cb('mainmenu', ctx.from.id) }]
      ]}
    });
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
      row.push({ text: `${s1 ? '✅' : '⬜'} ${h1.template.name}`, callback_data: `toggle_hero_pvp:${h1.id}:uid:${uid}` });
      if (i + 1 < heroes.length) {
        const h2 = heroes[i + 1];
        const s2 = session.selectedHeroes.includes(h2.id);
        row.push({ text: `${s2 ? '✅' : '⬜'} ${h2.template.name}`, callback_data: `toggle_hero_pvp:${h2.id}:uid:${uid}` });
      }
      buttons.push(row);
    }

    buttons.push([
      { text: `⚔️ حمله (${session.selectedHeroes.length})`, callback_data: cb('pvp_confirm', uid) },
      { text: '🔙 بازگشت', callback_data: cb('pvp', uid) }
    ]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};