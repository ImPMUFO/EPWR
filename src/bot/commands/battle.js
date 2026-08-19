const { getSession, clearSession, getPlayerHeroes, getBotRealms, getDefeatedNPCs, calcTeamPower, fightNPC } = require('../../game/battle');
const { reply, cb } = require('../../core/helpers');

module.exports = function registerBattle(bot) {
  bot.command('battle', async (ctx) => { await showBattleMenu(ctx); });
  bot.action(/^battle\|(\d+)$/, async (ctx) => { await ctx.answerCbQuery(); await showBattleMenu(ctx); });

  bot.action(/^battle_npc\|(\d+)\|(\d+)$/, async (ctx) => {
    const session = getSession(ctx.from.id);
    session.target = parseInt(ctx.match[1]);
    session.targetType = 'npc';
    session.selectedHeroes = [];
    await ctx.answerCbQuery();
    await showHeroSelection(ctx);
  });

  bot.action(/^toggle_hero\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const session = getSession(ctx.from.id);
    const heroId = ctx.match[1];
    const idx = session.selectedHeroes.indexOf(heroId);
    if (idx >= 0) session.selectedHeroes.splice(idx, 1);
    else session.selectedHeroes.push(heroId);
    await showHeroSelection(ctx);
  });

  bot.action(/^confirm_attack\|(\d+)$/, async (ctx) => {
    const session = getSession(ctx.from.id);
    if (session.selectedHeroes.length === 0) return ctx.answerCbQuery('⚠️ قهرمان انتخاب کن!', { show_alert: true });
    await ctx.answerCbQuery();
    const bots = await getBotRealms();
    const target = bots.find(b => b.id === session.target);
    if (!target) return;
    const result = await fightNPC(ctx.from.id, target, session.selectedHeroes);
    clearSession(ctx.from.id);
    if (!result.success) return ctx.answerCbQuery(result.message, { show_alert: true });
    const title = result.playerWins ? '🏆 پیروزی!' : '💀 شکست!';
    let msg = `⚔️ *${title}*\n⚡ تو: ${result.playerPower} | ${target.emoji} حریف: ${result.botPower}\n`;
    if (result.playerWins) msg += `💰 +${result.goldReward}\n🎉 فتح شد!`;
    else msg += result.deadHeroes.length > 0 ? `☠️ ${result.deadHeroes.join(', ')}` : '🩹 آسیب دیدند';
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '⚔️ دوباره', callback_data: cb('battle', ctx.from.id) }], [{ text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]] } });
  });

  async function showBattleMenu(ctx) {
    const bots = await getBotRealms();
    const defeated = await getDefeatedNPCs(ctx.from.id);
    const available = bots.filter(b => !defeated.includes(b.id));
    const uid = ctx.from.id;
    let msg = '⚔️ *میدان نبرد*\n\n';
    const buttons = [];
    if (available.length === 0) msg += '🎉 همه فتح شدن!';
    else available.forEach(b => {
      msg += `${b.emoji} *${b.name}* ${'⭐'.repeat(b.difficulty)} | 💰${b.gold_reward_min}-${b.gold_reward_max}\n`;
      buttons.push([{ text: `${b.emoji} ${b.name}`, callback_data: `battle_npc|${b.id}|${uid}` }]);
    });
    buttons.push([{ text: '👥 PvP', callback_data: cb('pvp', uid) }, { text: '🗺️ جهان', callback_data: cb('world', uid) }]);
    buttons.push([{ text: '🔙', callback_data: cb('mainmenu', uid) }]);
    await reply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }

  async function showHeroSelection(ctx) {
    const heroes = await getPlayerHeroes(ctx.from.id);
    if (heroes.length === 0) return ctx.answerCbQuery('❌ قهرمان نداری!', { show_alert: true });
    const session = getSession(ctx.from.id);
    const uid = ctx.from.id;
    let msg = '🎯 *انتخاب قهرمان*\n\n';
    const buttons = [];
    for (let i = 0; i < heroes.length; i += 2) {
      const row = [];
      const h1 = heroes[i];
      const s1 = session.selectedHeroes.includes(h1.id);
      const hp1 = Math.floor((h1.current_health / (h1.template.base_health * h1.level)) * 100);
      row.push({ text: `${s1 ? '✅' : '⬜'} ${h1.template.name} ❤${hp1}%`, callback_data: `toggle_hero|${h1.id}|${uid}` });
      if (i + 1 < heroes.length) {
        const h2 = heroes[i + 1];
        const s2 = session.selectedHeroes.includes(h2.id);
        const hp2 = Math.floor((h2.current_health / (h2.template.base_health * h2.level)) * 100);
        row.push({ text: `${s2 ? '✅' : '⬜'} ${h2.template.name} ❤${hp2}%`, callback_data: `toggle_hero|${h2.id}|${uid}` });
      }
      buttons.push(row);
    }
    const power = calcTeamPower(heroes.filter(h => session.selectedHeroes.includes(h.id)));
    msg += `⚡ قدرت: *${power}*\n`;
    buttons.push([{ text: `⚔️ حمله (${session.selectedHeroes.length})`, callback_data: cb('confirm_attack', uid) }, { text: '🔙', callback_data: cb('battle', uid) }]);
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};