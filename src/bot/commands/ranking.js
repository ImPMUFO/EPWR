const { getSupabase } = require('../../core/supabase');
const { formatGold, smartReply, cb } = require('../../core/helpers');

module.exports = function registerRanking(bot) {
  // دستور /ranking
  bot.command('ranking', async (ctx) => {
    await showRanking(ctx);
  });

  // دکمه رتبه‌بندی
  bot.action(/^ranking\|(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await showRanking(ctx);
  });

  async function showRanking(ctx) {
    const db = getSupabase();
    const { data } = await db.from('players')
      .select('commander_name, level, gold')
      .order('level', { ascending: false })
      .limit(10);

    let msg = '🏆 *رتبه‌بندی*\n\n';
    const medals = ['🥇', '🥈', '🥉'];
    (data || []).forEach((p, i) => {
      msg += `${i < 3 ? medals[i] : i + 1}. ${p.commander_name} | Lv.${p.level} | 💰${formatGold(p.gold)}\n`;
    });
    if (!data || data.length === 0) msg += 'هنوز بازیکنی نیست!';

    await smartReply(ctx, msg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '🔙', callback_data: cb('mainmenu', ctx.from.id) }]] }
    });
  }
};