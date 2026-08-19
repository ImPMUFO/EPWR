const { getSupabase } = require('../../core/supabase');
const { formatGold } = require('../../core/helpers');

module.exports = function registerRanking(bot) {
  bot.action('ranking', async (ctx) => {
    await ctx.answerCbQuery();
    const db = getSupabase();
    const { data: players } = await db.from('players')
      .select('commander_name, realm_name, level, gold')
      .order('level', { ascending: false })
      .limit(10);

    let msg = `🏆 *رتبه‌بندی EPWR*\n\n`;
    const medals = ['🥇', '🥈', '🥉'];
    (players || []).forEach((p, i) => {
      const medal = i < 3 ? medals[i] : `${i + 1}.`;
      msg += `${medal} *${p.commander_name}* | Lv.${p.level} | 💰${formatGold(p.gold)}\n`;
    });

    if (!players || players.length === 0) msg += `هنوز بازیکنی نیست!`;

    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
  });
};