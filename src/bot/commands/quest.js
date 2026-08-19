const { assignDailyQuests, getPlayerQuests, claimQuestReward } = require('../../game/quest');
const { formatGold, reply, cb } = require('../../core/helpers');

module.exports = function registerQuest(bot) {
  bot.action(/^quest\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await assignDailyQuests(ctx.from.id);
    await showQuests(ctx);
  });

  bot.action(/^claim_quest\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await claimQuestReward(ctx.from.id, ctx.match[1]);
    await ctx.answerCbQuery(result.success ? `🎁 +${result.gold}💰 +${result.gems}💎` : result.message, { show_alert: true });
    await showQuests(ctx);
  });

  async function showQuests(ctx) {
    const quests = await getPlayerQuests(ctx.from.id);
    const uid = ctx.from.id;
    let msg = '📜 *مأموریت‌ها*\n\n';
    const buttons = [];
    quests.forEach(q => {
      const bar = q.is_completed ? '✅' : `${q.progress}/${q.quest.target_count}`;
      msg += `🎯 ${q.quest.description} | ${bar}\n`;
      if (q.is_completed && !q.is_claimed) buttons.push([{ text: '🎁 دریافت', callback_data: `claim_quest|${q.id}|${uid}` }]);
    });
    if (quests.length === 0) msg += '📭 مأموریتی نیست!';
    buttons.push([{ text: '🔙', callback_data: cb('mainmenu', uid) }]);
    await reply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};