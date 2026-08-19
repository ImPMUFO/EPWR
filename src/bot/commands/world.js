const { getBotRealms, getDefeatedNPCs } = require('../../game/battle');
const { getSupabase } = require('../../core/supabase');
const { reply, cb } = require('../../core/helpers');

module.exports = function registerWorld(bot) {
  bot.command('world', async (ctx) => { await showWorld(ctx); });
  bot.action(/world:uid:(\d+)/, async (ctx) => { await ctx.answerCbQuery(); await showWorld(ctx); });

  async function showWorld(ctx) {
    const bots = await getBotRealms();
    const defeated = await getDefeatedNPCs(ctx.from.id);
    const db = getSupabase();
    const uid = ctx.from.id;

    const { count: totalPlayers } = await db.from('players')
      .select('*', { count: 'exact', head: true });

    let msg = `🗺️ *نقشه جهان*\n\n`;
    msg += `👥 بازیکنان: ${totalPlayers || 0} | 🏆 فتح‌ها: ${defeated.length}/${bots.length}\n\n`;

    const buttons = [];
    bots.forEach(b => {
      const isDefeated = defeated.includes(b.id);
      if (isDefeated) {
        msg += `✅ ~~${b.emoji} ${b.name}~~\n`;
      } else {
        msg += `${b.emoji} *${b.name}* ${'⭐'.repeat(b.difficulty)}\n`;
        buttons.push([{ text: `${b.emoji} ${b.name}`, callback_data: `battle_npc:${b.id}:uid:${uid}` }]);
      }
    });

    buttons.push([{ text: '⚔️ نبرد', callback_data: cb('battle', uid) }]);
    buttons.push([{ text: '🔙 بازگشت', callback_data: cb('mainmenu', uid) }]);

    await reply(ctx, msg, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
  }
};