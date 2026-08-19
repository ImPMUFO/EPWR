const { findPvPTargets, executePvP } = require('../../game/pvp');
const { getPlayerHeroes, getSession, clearSession } = require('../../game/battle');
const { formatGold, reply } = require('../../core/helpers');

module.exports = function registerPvP(bot) {

  bot.action('pvp', async (ctx) => {
    await ctx.answerCbQuery();
    const targets = await findPvPTargets(ctx.from.id);
    if (targets.length === 0) {
      return reply(ctx, '👥 بازیکنی برای جنگ نیست!', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'battle' }]] }
      });
    }

    let msg = `🎯 *انتخاب حریف PvP*\n\n`;
    const buttons = [];
    targets.forEach(t => {
      msg += `👤 *${t.commander_name}* Lv.${t.level} | 💰${formatGold(t.gold)}\n`;
      buttons.push([{ text: `⚔️ حمله به ${t.commander_name}`, callback_data: `pvp_target:${t.telegram_id}` }]);
    });
    buttons.push([{ text: '🔙 بازگشت', callback_data: 'battle' }]);
    await reply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  });

  bot.action(/^pvp_target:(\d+)$/, async (ctx) => {
    const session = getSession(ctx.from.id);
    session.target = parseInt(ctx.match[1]);
    session.targetType = 'pvp';
    session.selectedHeroes = [];
    await ctx.answerCbQuery();
    await showHeroSelectionPvP(ctx);
  });

  bot.action(/^toggle_hero_pvp:(.+)$/, async (ctx) => {
    const session = getSession(ctx.from.id);
    if (!session.target || session.targetType !== 'pvp') {
      return ctx.answerCbQuery('⚠️ لطفاً اول حریف PvP انتخاب کن!', { show_alert: true });
    }
    await ctx.answerCbQuery();
    const heroId = ctx.match[1];
    const idx = session.selectedHeroes.indexOf(heroId);
    if (idx >= 0) session.selectedHeroes.splice(idx, 1);
    else session.selectedHeroes.push(heroId);
    await showHeroSelectionPvP(ctx);
  });

  bot.action('pvp_confirm', async (ctx) => {
    const session = getSession(ctx.from.id);
    if (!session.target || session.targetType !== 'pvp') {
      return ctx.answerCbQuery('⚠️ لطفاً اول /battle بزن و PvP انتخاب کن!', { show_alert: true });
    }
    if (session.selectedHeroes.length === 0) {
      return ctx.answerCbQuery('⚠️ قهرمانی انتخاب نکردی!', { show_alert: true });
    }
    await ctx.answerCbQuery();

    const result = await executePvP(ctx.from.id, session.target, session.selectedHeroes);
    clearSession(ctx.from.id);

    if (!result.success) return reply(ctx, result.message);

    let msg = `⚔️ *جنگ PvP*\n\n`;
    msg += result.attackerWins ? `🏆 *پیروزی!*\n` : `💀 *شکست!*\n`;
    msg += `🎯 حریف: ${result.defenderName}\n`;
    msg += `⚡ قدرت تو: ${result.attackerPower}\n`;
    msg += `⚡ قدرت حریف: ${result.defenderPower}\n`;
    if (result.attackerWins && result.goldStolen > 0) {
      msg += `\n💰 *${result.goldStolen} Gold دزدیدی!*`;
    }

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '⚔️ نبرد دوباره', callback_data: 'battle' }], [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]] }
    });
  });

  async function showHeroSelectionPvP(ctx) {
    const heroes = await getPlayerHeroes(ctx.from.id);
    const session = getSession(ctx.from.id);
    let msg = `🎯 *قهرمانانت رو انتخاب کن (PvP)*\n\n`;
    const buttons = [];

    heroes.forEach(h => {
      const selected = session.selectedHeroes.includes(h.id);
      const icon = selected ? '✅' : '⬜';
      msg += `${icon} *${h.template.name}* Lv.${h.level}\n`;
      buttons.push([{ text: `${icon} ${h.template.name}`, callback_data: `toggle_hero_pvp:${h.id}` }]);
    });

    buttons.push([
      { text: `⚔️ حمله! (${session.selectedHeroes.length})`, callback_data: 'pvp_confirm' },
      { text: '🔙 بازگشت', callback_data: 'pvp' }
    ]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};