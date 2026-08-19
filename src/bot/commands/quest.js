const { assignDailyQuests, getPlayerQuests, claimQuestReward } = require('../../game/quest');
const { formatGold } = require('../../core/helpers');

module.exports = function registerQuest(bot) {

  bot.action('quest', async (ctx) => {
    await ctx.answerCbQuery();
    await assignDailyQuests(ctx.from.id);
    await showQuests(ctx);
  });

  bot.action(/^claim_quest:(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await claimQuestReward(ctx.from.id, ctx.match[1]);
    if (result.success) {
      await ctx.answerCbQuery(`🎁 پاداش: +${result.gold}💰 +${result.gems}💎`, { show_alert: true });
    } else {
      await ctx.answerCbQuery(result.message, { show_alert: true });
    }
    await showQuests(ctx);
  });

  async function showQuests(ctx) {
    const quests = await getPlayerQuests(ctx.from.id);
    let msg = `📜 *مأموریت‌های روزانه*\n\n`;
    const buttons = [];

    quests.forEach(q => {
      const percent = Math.floor((q.progress / q.quest.target_count) * 100);
      const bar = q.is_completed ? '✅' : `${q.progress}/${q.quest.target_count}`;
      msg += `🎯 *${q.quest.description}*\n`;
      msg += `   📊 ${bar} | 💰${q.quest.gold_reward} 💎${q.quest.gems_reward}\n`;
      
      if (q.is_completed && !q.is_claimed) {
        buttons.push([{ text: `🎁 دریافت پاداش: ${q.quest.description}`, callback_data: `claim_quest:${q.id}` }]);
      }
    });

    if (quests.length === 0) msg += `📭 مأموریتی نیست!`;

    buttons.push([{ text: '🔙 بازگشت', callback_data: 'mainmenu' }]);
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};