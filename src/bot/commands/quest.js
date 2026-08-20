const { assignDailyQuests, getPlayerQuests, claimQuestReward } = require('../../game/quest');
const { smartReply, cb } = require('../../core/helpers');

module.exports = function registerQuest(bot) {
  bot.command('quest', async (ctx) => { await showQuests(ctx); });
  bot.action(/^quest\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showQuests(ctx);
  });

  bot.action(/^claim_quest\|(.+)\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const result = await claimQuestReward(ctx.from.id, ctx.match[1]);
    if (result.success) {
      let msg = '🎁 *پاداش دریافت شد!*\n\n';
      if (result.gold > 0) msg += `💰 +${result.gold} سکه\n`;
      if (result.gems > 0) msg += `💎 +${result.gems} الماس\n`;
      await ctx.answerCbQuery(msg, { show_alert: true });
    } else {
      await ctx.answerCbQuery(result.message, { show_alert: true });
    }
    await showQuests(ctx);
  });

  async function showQuests(ctx) {
    await assignDailyQuests(ctx.from.id);
    const quests = await getPlayerQuests(ctx.from.id);
    const uid = ctx.from.id;

    let msg = `📜 *مأموریت‌های روزانه*\n\n`;
    msg += `🎯 مأموریت‌ها هر روز عوض می‌شن!\n\n`;
    
    const buttons = [];

    if (quests.length === 0) {
      msg += `📭 مأموریتی نیست!`;
    } else {
      quests.forEach(q => {
        if (!q.quest) return;
        
        const isDone = q.is_completed;
        const isClaimed = q.is_claimed;
        const progress = Math.min(q.progress, q.quest.target_count);
        
        // نوار پیشرفت
        const barLength = 10;
        const filled = Math.floor((progress / q.quest.target_count) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        
        // آیکون وضعیت
        let statusIcon = '🔄';
        if (isClaimed) statusIcon = '✅';
        else if (isDone) statusIcon = '🎁';
        
        msg += `${statusIcon} *${q.quest.description}*\n`;
        msg += `   ${bar} ${progress}/${q.quest.target_count}\n`;
        msg += `   🎁 پاداش: 💰${q.quest.gold_reward || 0}`;
        if (q.quest.gems_reward > 0) msg += ` 💎${q.quest.gems_reward}`;
        msg += `\n\n`;
        
        if (isDone && !isClaimed) {
          buttons.push([{ text: `🎁 دریافت پاداش: ${q.quest.description}`, callback_data: `claim_quest|${q.id}|${uid}` }]);
        }
      });
    }
    
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);
    
    await smartReply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};