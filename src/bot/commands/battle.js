const { getSession, clearSession, getPlayerHeroes, getBotRealms, getDefeatedNPCs, calcTeamPower, fightNPC } = require('../../game/battle');
const { formatGold, reply } = require('../../core/helpers');

module.exports = function registerBattle(bot) {

  bot.command('battle', async (ctx) => { await showBattleMenu(ctx); });
  bot.action('battle', async (ctx) => { await ctx.answerCbQuery(); await showBattleMenu(ctx); });

  // انتخاب NPC - چک session
  bot.action(/^battle_npc:(\d+)$/, async (ctx) => {
    const session = getSession(ctx.from.id);
    if (session.targetType === 'npc' && session.target === parseInt(ctx.match[1])) {
      return ctx.answerCbQuery('⚠️ قبلاً این حریف رو انتخاب کردی!', { show_alert: true });
    }
    await ctx.answerCbQuery();
    session.target = parseInt(ctx.match[1]);
    session.targetType = 'npc';
    session.selectedHeroes = [];
    await showHeroSelection(ctx);
  });

  // Toggle قهرمان - چک session
  bot.action(/^toggle_hero:(.+)$/, async (ctx) => {
    const session = getSession(ctx.from.id);
    if (!session.target) {
      return ctx.answerCbQuery('⚠️ لطفاً اول حریف انتخاب کن! (/battle)', { show_alert: true });
    }
    await ctx.answerCbQuery();
    const heroId = ctx.match[1];
    const idx = session.selectedHeroes.indexOf(heroId);
    if (idx >= 0) session.selectedHeroes.splice(idx, 1);
    else session.selectedHeroes.push(heroId);
    await showHeroSelection(ctx);
  });

  // تأیید و حمله - چک session
  bot.action('confirm_attack', async (ctx) => {
    const session = getSession(ctx.from.id);
    if (!session.target) {
      return ctx.answerCbQuery('⚠️ لطفاً اول /battle بزن و حریف انتخاب کن!', { show_alert: true });
    }
    if (session.selectedHeroes.length === 0) {
      return ctx.answerCbQuery('⚠️ قهرمانی انتخاب نکردی!', { show_alert: true });
    }
    await ctx.answerCbQuery();

    const bots = await getBotRealms();
    const target = bots.find(b => b.id === session.target);
    if (!target) return reply(ctx, '❌ حریف پیدا نشد!');

    const result = await fightNPC(ctx.from.id, target, session.selectedHeroes);
    clearSession(ctx.from.id);

    if (!result.success) return reply(ctx, result.message);

    const emoji = result.playerWins ? '🏆' : '💀';
    const title = result.playerWins ? 'پیروزی!' : 'شکست!';
    let msg = `⚔️ *${title}*\n\n`;
    msg += `━━━━━━━━━━━━━━━━\n`;
    msg += `👤 قدرت تیم تو: ${result.playerPower}\n`;
    msg += `${target.emoji} قدرت ${target.name}: ${result.botPower}\n`;
    msg += `━━━━━━━━━━━━━━━━\n\n`;

    if (result.playerWins) {
      msg += `💰 *${result.goldReward} Gold غنیمت گرفتی!*\n\n`;
      msg += `🎉 ${target.name} فتح شد!\n`;
      msg += `🔒 این سرزمین دیگه قابل حمله نیست.`;
    } else {
      msg += `😤 شکست خوردی...\n\n`;
      if (result.deadHeroes.length > 0) {
        msg += `💀 *قهرمانان کشته شده:*\n`;
        result.deadHeroes.forEach(name => { msg += `   ☠️ ${name}\n`; });
        msg += `\n⚠️ این قهرمانان حذف شدند!\nباید از فروشگاه قهرمان جدید بخری.`;
      } else {
        msg += `🩹 قهرمانانت آسیب دیدند ولی زنده ماندند.`;
      }
    }

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚔️ نبرد دوباره', callback_data: 'battle' }],
          [{ text: '🛒 فروشگاه', callback_data: 'shop' }],
          [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
        ]
      }
    });
  });

  async function showBattleMenu(ctx) {
    const bots = await getBotRealms();
    const defeated = await getDefeatedNPCs(ctx.from.id);

    let msg = `⚔️ *میدان نبرد*\n\n`;
    msg += `🎯 حریفت رو انتخاب کن و بجنگ!\n\n`;

    const buttons = [];

    bots.forEach(b => {
      const isDefeated = defeated.includes(b.id);
      if (!isDefeated) {
        const stars = '⭐'.repeat(b.difficulty);
        msg += `${b.emoji} *${b.name}* ${stars} | 💰${b.gold_reward_min}-${b.gold_reward_max}\n`;
        buttons.push([{ text: `${b.emoji} حمله به ${b.name}`, callback_data: `battle_npc:${b.id}` }]);
      }
    });

    if (buttons.length === 0) {
      msg += `\n🎉 *همه سرزمین‌ها فتح شدن!*`;
    }

    buttons.push([{ text: '👥 جنگ PvP', callback_data: 'pvp' }]);
    buttons.push([{ text: '🗺️ نقشه جهان', callback_data: 'world' }]);
    buttons.push([{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]);

    await reply(ctx, msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }

  async function showHeroSelection(ctx) {
    const heroes = await getPlayerHeroes(ctx.from.id);
    if (heroes.length === 0) {
      return reply(ctx, '❌ قهرمان زنده‌ای نداری! اول از فروشگاه بخر.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 فروشگاه', callback_data: 'shop' }],
            [{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]
          ]
        }
      });
    }

    const session = getSession(ctx.from.id);
    let msg = `🎯 *قهرمانانت رو انتخاب کن*\n\n`;
    const buttons = [];

    heroes.forEach(h => {
      const t = h.template;
      const selected = session.selectedHeroes.includes(h.id);
      const icon = selected ? '✅' : '⬜';
      const hpPercent = Math.floor((h.current_health / (t.base_health * h.level)) * 100);
      msg += `${icon} *${t.name}* Lv.${h.level} (❤${hpPercent}%) 🗡${t.base_attack} 🛡${t.base_defense}\n`;
      buttons.push([{ text: `${icon} ${t.name} (❤${hpPercent}%)`, callback_data: `toggle_hero:${h.id}` }]);
    });

    const power = calcTeamPower(heroes.filter(h => session.selectedHeroes.includes(h.id)));
    msg += `\n⚡ قدرت تیم: *${power}*\n`;

    buttons.push([
      { text: `⚔️ حمله! (${session.selectedHeroes.length} قهرمان)`, callback_data: 'confirm_attack' },
      { text: '🔙 بازگشت', callback_data: 'battle' }
    ]);

    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: buttons }
    });
  }
};